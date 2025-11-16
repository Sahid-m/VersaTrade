// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/*
    GameHouseAdvanced

    Features:
    - Per-game token: specify ERC20 token address or address(0) for native.
    - Signature-based settlement (EIP-712). Both players sign the result.
    - Timeouts: creator can cancel if nobody joins within joinTimeout.
      If both joined and no settlement in settleTimeout, either party can request a split refund.
    - Per-token accumulatedFees and owner withdrawals in token units.
    - pendingWithdrawals[token][user] support for failed payouts.
    - Safe transfers for ERC20 via low-level call checking return data; native transfers via call.
    - Pause, platform fee control, emergency withdraw.
*/

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "../lib/openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import "../lib/openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract VersaTrade is Ownable, ReentrancyGuard, EIP712 {
    using ECDSA for bytes32;

    enum GameState {
        Created,
        Joined,
        Completed,
        Cancelled
    }

    struct Game {
        address creator;
        address opponent;
        address token; // token used for this game (address(0) = native)
        uint256 betAmount; // in token units (or native units)
        uint256 createdAt;
        GameState state;
        address winner;
    }

    // EIP-712 typehash for result message
    bytes32 public constant RESULT_TYPEHASH =
        keccak256("Result(uint256 gameId,address winner)");

    // timeouts (seconds)
    uint256 public joinTimeout = 1 days; // creator can cancel if not joined
    uint256 public settleTimeout = 3 days; // if joined but not settled, allow split refund

    uint16 public platformFeeBps;
    uint256 public nextGameId;
    bool public paused;

    mapping(uint256 => Game) public games;

    // per-token accounting
    mapping(address => uint256) public accumulatedFees; // token => amount (token==address(0) for native)
    mapping(address => mapping(address => uint256)) public pendingWithdrawals; // token => user => amount

    // constants
    uint16 public constant MAX_PLATFORM_FEE_BPS = 1000; // 10%

    // events
    event GameCreated(
        uint256 indexed gameId,
        address indexed creator,
        address token,
        uint256 amount
    );
    event GameJoined(uint256 indexed gameId, address indexed joiner);
    event GameCompleted(
        uint256 indexed gameId,
        address indexed winner,
        uint256 payout,
        uint256 fee
    );
    event GameCancelled(uint256 indexed gameId);
    event PlatformFeeChanged(uint16 newBps);
    event OwnerWithdraw(address indexed token, uint256 amount, address to);
    event Paused(bool paused);
    event PayoutCredit(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    event Withdrawal(address indexed token, address indexed to, uint256 amount);
    event TimeoutsUpdated(uint256 joinTimeout, uint256 settleTimeout);
    event EmergencyWithdrawn(
        uint256 indexed gameId,
        address indexed to,
        address token,
        uint256 amount
    );

    modifier notPaused() {
        require(!paused, "paused");
        _;
    }

    constructor(
        uint16 _platformFeeBps
    ) Ownable(msg.sender) EIP712("GameHouseAdvanced", "1") {
        require(_platformFeeBps <= MAX_PLATFORM_FEE_BPS, "fee too high");
        platformFeeBps = _platformFeeBps;
        nextGameId = 1;
    }

    // ---------- GAME LIFECYCLE ----------

    /**
     * @notice Create a game. If token == address(0), send native (msg.value must equal betAmount).
     *         Otherwise, caller must have approved this contract to pull `betAmount` of ERC20 token.
     */
    function createGame(
        address token,
        uint256 betAmount
    ) external payable notPaused nonReentrant returns (uint256) {
        require(betAmount > 0, "bet=0");
        if (token == address(0)) {
            // native: require msg.value
            require(msg.value == betAmount, "native: wrong value");
        } else {
            require(msg.value == 0, "do not send native");
            // pull ERC20 from creator
            _pullERC20(token, msg.sender, betAmount);
        }

        uint256 id = nextGameId++;
        games[id] = Game({
            creator: msg.sender,
            opponent: address(0),
            token: token,
            betAmount: betAmount,
            createdAt: block.timestamp,
            state: GameState.Created,
            winner: address(0)
        });

        emit GameCreated(id, msg.sender, token, betAmount);
        return id;
    }

    /**
     * @notice Join an open game. For ERC20 games, caller must approve the contract for betAmount.
     *         For native games, send msg.value == betAmount.
     */
    function joinGame(uint256 gameId) external payable notPaused nonReentrant {
        Game storage g = games[gameId];
        require(g.creator != address(0), "bad game");
        require(g.state == GameState.Created, "not open");
        require(msg.sender != g.creator, "creator cannot join");

        if (g.token == address(0)) {
            require(msg.value == g.betAmount, "native: wrong value");
        } else {
            require(msg.value == 0, "do not send native");
            _pullERC20(g.token, msg.sender, g.betAmount);
        }

        g.opponent = msg.sender;
        g.state = GameState.Joined;

        emit GameJoined(gameId, msg.sender);
    }

    /**
     * @notice Settle game using EIP-712 signatures from both players.
     *         Anyone may call with valid signatures from both participants.
     * @param gameId the id
     * @param winner address of the winner (must be creator or opponent)
     * @param sigCreator signature by creator over Result(gameId, winner)
     * @param sigOpponent signature by opponent over Result(gameId, winner)
     */
    function settleGame(
        uint256 gameId,
        address winner,
        bytes calldata sigCreator,
        bytes calldata sigOpponent
    ) external notPaused nonReentrant {
        Game storage g = games[gameId];
        require(g.creator != address(0), "bad game");
        require(g.state == GameState.Joined, "not joined");
        require(winner == g.creator || winner == g.opponent, "bad winner");

        // verify signatures
        bytes32 structHash = keccak256(
            abi.encode(RESULT_TYPEHASH, gameId, winner)
        );
        bytes32 digest = _hashTypedDataV4(structHash);

        address recoveredCreator = ECDSA.recover(digest, sigCreator);
        address recoveredOpponent = ECDSA.recover(digest, sigOpponent);

        require(recoveredCreator == g.creator, "invalid sig creator");
        require(recoveredOpponent == g.opponent, "invalid sig opponent");

        // mark completed
        g.state = GameState.Completed;
        g.winner = winner;

        uint256 pot = g.betAmount * 2;
        uint256 fee = (pot * platformFeeBps) / 10000;
        uint256 payout = pot - fee;

        accumulatedFees[g.token] += fee;

        // attempt to pay winner; if transfer fails, credit pendingWithdrawals
        if (!_attemptTransfer(g.token, winner, payout)) {
            pendingWithdrawals[g.token][winner] += payout;
            emit PayoutCredit(g.token, winner, payout);
        }

        emit GameCompleted(gameId, winner, payout, fee);
    }

    // ---------- TIMEOUTS & REFUNDS ----------

    /**
     * @notice If a game was created but not joined within joinTimeout, creator may cancel and get refund.
     */
    function cancelIfNotJoined(uint256 gameId) external nonReentrant {
        Game storage g = games[gameId];
        require(g.creator != address(0), "bad game");
        require(msg.sender == g.creator, "not creator");
        require(g.state == GameState.Created, "not created");
        require(block.timestamp >= g.createdAt + joinTimeout, "too soon");

        g.state = GameState.Cancelled;
        uint256 refund = g.betAmount;
        g.betAmount = 0;

        if (!_attemptTransfer(g.token, g.creator, refund)) {
            pendingWithdrawals[g.token][g.creator] += refund;
            emit PayoutCredit(g.token, g.creator, refund);
        }

        emit GameCancelled(gameId);
    }

    /**
     * @notice If a game was joined but not settled within settleTimeout (from creation),
     * either player may call to split refunds (each gets their original stake).
     */
    function splitRefundAfterTimeout(uint256 gameId) external nonReentrant {
        Game storage g = games[gameId];
        require(g.creator != address(0), "bad game");
        require(g.state == GameState.Joined, "not joined");
        require(block.timestamp >= g.createdAt + settleTimeout, "too soon");
        require(
            msg.sender == g.creator || msg.sender == g.opponent,
            "not participant"
        );

        g.state = GameState.Cancelled;

        uint256 each = g.betAmount;
        g.betAmount = 0;

        // credit creator
        if (!_attemptTransfer(g.token, g.creator, each)) {
            pendingWithdrawals[g.token][g.creator] += each;
            emit PayoutCredit(g.token, g.creator, each);
        }
        // credit opponent
        if (!_attemptTransfer(g.token, g.opponent, each)) {
            pendingWithdrawals[g.token][g.opponent] += each;
            emit PayoutCredit(g.token, g.opponent, each);
        }

        emit GameCancelled(gameId);
    }

    // ---------- WITHDRAW PENDING ----------

    /**
     * @notice Claim any pending withdrawals for a specific token.
     */
    function claimPayout(address token) external nonReentrant {
        uint256 amount = pendingWithdrawals[token][msg.sender];
        require(amount > 0, "nothing");

        pendingWithdrawals[token][msg.sender] = 0;

        if (!_attemptTransfer(token, msg.sender, amount)) {
            // restore on failure
            pendingWithdrawals[token][msg.sender] = amount;
            revert("transfer failed, credited");
        }

        emit Withdrawal(token, msg.sender, amount);
    }

    // ---------- OWNER ACTIONS ----------

    function setPlatformFee(uint16 newBps) external onlyOwner {
        require(newBps <= MAX_PLATFORM_FEE_BPS, "too high");
        platformFeeBps = newBps;
        emit PlatformFeeChanged(newBps);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function setTimeouts(
        uint256 _joinTimeout,
        uint256 _settleTimeout
    ) external onlyOwner {
        joinTimeout = _joinTimeout;
        settleTimeout = _settleTimeout;
        emit TimeoutsUpdated(_joinTimeout, _settleTimeout);
    }

    /**
     * @notice Withdraw accumulated platform fees for a specific token to `to`.
     */
    function withdrawFees(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(amount <= accumulatedFees[token], "insufficient");
        accumulatedFees[token] -= amount;

        if (!_attemptTransfer(token, to, amount)) {
            // if transfer fails, restore accumulatedFees and credit pendingWithdrawals
            accumulatedFees[token] += amount;
            pendingWithdrawals[token][to] += amount;
            emit PayoutCredit(token, to, amount);
            revert("fee withdraw failed, credited");
        }

        emit OwnerWithdraw(token, amount, to);
    }

    /**
     * @notice Emergency withdraw: owner can force move funds for an active game into pendingWithdrawals[to].
     *         Use only for recovery situations (owner action is trusted).
     */
    function emergencyWithdraw(uint256 gameId, address to) external onlyOwner {
        Game storage g = games[gameId];
        require(g.creator != address(0), "bad game");
        require(
            g.state == GameState.Created || g.state == GameState.Joined,
            "not active"
        );

        uint256 amount = (g.state == GameState.Created)
            ? g.betAmount
            : (g.betAmount * 2);
        address token = g.token;

        g.betAmount = 0;
        g.state = GameState.Cancelled;

        pendingWithdrawals[token][to] += amount;

        emit EmergencyWithdrawn(gameId, to, token, amount);
    }

    // ---------- INTERNAL TRANSFER HELPERS ----------

    /**
     * @dev Pull ERC20 tokens (safe pull that expects transferFrom to succeed).
     */
    function _pullERC20(address token, address from, uint256 amount) internal {
        // low-level call to token.transferFrom(from, address(this), amount) and check return
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                from,
                address(this),
                amount
            )
        );
        require(
            ok && (data.length == 0 || abi.decode(data, (bool))),
            "ERC20 pull failed"
        );
    }

    /**
     * @dev Try to transfer token/native amount to `to`. Returns true on success, false on failure (credits must be handled by caller).
     */
    function _attemptTransfer(
        address token,
        address to,
        uint256 amount
    ) internal returns (bool) {
        if (amount == 0) return true;
        if (token == address(0)) {
            // native transfer
            (bool success, ) = payable(to).call{value: amount}("");
            return success;
        } else {
            // ERC20 low-level transfer (non-reverting handling)
            (bool ok, bytes memory data) = token.call(
                abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
            );
            if (!ok) return false;
            if (data.length == 0) return true; // non-standard ERC20 that returns nothing
            return abi.decode(data, (bool));
        }
    }

    // ---------- FALLBACKS ----------

    receive() external payable {}
    fallback() external payable {}
}
