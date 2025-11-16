// src/app/wallet/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ethers } from 'ethers';
import { Loader2, Wallet, Copy, Download, AlertTriangle, ShieldCheck, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface UserProfile {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    walletAddress: string;
    privateKey: string;
}

// ARC Testnet Configuration
const ARC_TESTNET_RPC = "https://arc-testnet.g.alchemy.com/v2/R4_BWzH4o-v4_c9jRvKWj";
const GATEWAY_PROXY_CONTRACT_ADDRESS = "0x0077777d7EBA4688BDeF3E311b846F25870A19B9";
const USDC_TOKEN_ADDRESS_ON_ARC = "0x3600000000000000000000000000000000000000";

const GATEWAY_ABI = [
    "function availableBalance(address token, address depositer) view returns (uint256)"
];
const USDC_ABI = [
    "function balanceOf(address account) view returns (uint256)"
];


export default function WalletPage() {
    const { user, isLoading: isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const userDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'users', user.uid) : null), [firestore, user]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    const [nativeBalance, setNativeBalance] = useState<string | null>(null);
    const [gatewayBalance, setGatewayBalance] = useState<string | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [isDepositing, setIsDepositing] = useState(false);
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferAmount, setTransferAmount] = useState('');
    const [destinationChain, setDestinationChain] = useState('ethereum');


    const fetchBalances = async () => {
        if (userProfile?.walletAddress) {
            setIsLoadingBalance(true);
            try {
                const provider = new ethers.JsonRpcProvider(ARC_TESTNET_RPC);
                
                const usdcContract = new ethers.Contract(USDC_TOKEN_ADDRESS_ON_ARC, USDC_ABI, provider);
                const nativeRawBalance = await usdcContract.balanceOf(userProfile.walletAddress);
                const formattedNativeBalance = ethers.formatUnits(nativeRawBalance, 6);
                setNativeBalance(parseFloat(formattedNativeBalance).toFixed(2));

                const gatewayContract = new ethers.Contract(GATEWAY_PROXY_CONTRACT_ADDRESS, GATEWAY_ABI, provider);
                const gatewayRawBalance = await gatewayContract.availableBalance(USDC_TOKEN_ADDRESS_ON_ARC, userProfile.walletAddress);
                const formattedGatewayBalance = ethers.formatUnits(gatewayRawBalance, 6);
                setGatewayBalance(parseFloat(formattedGatewayBalance).toFixed(2));

            } catch (error) {
                console.error("Error fetching wallet balances:", error);
                setNativeBalance('Error');
                setGatewayBalance('Error');
                toast({
                    title: 'Balance Error',
                    description: 'Could not fetch ARC Testnet balances.',
                    variant: 'destructive'
                });
            } finally {
                setIsLoadingBalance(false);
            }
        }
    };

    useEffect(() => {
        fetchBalances();
    }, [userProfile]);

    const handleDepositToGateway = async () => {
        if (!userProfile?.privateKey || !nativeBalance || parseFloat(nativeBalance) <= 1) {
            toast({
                title: 'Deposit Error',
                description: 'Insufficient balance to deposit or private key not found.',
                variant: 'destructive',
            });
            return;
        }

        setIsDepositing(true);
        toast({
            title: 'Deposit Initiated',
            description: 'Approving and depositing funds to the gateway. Please wait...',
        });

        // Simulate the transaction delay
        setTimeout(() => {
            const amountToDeposit = parseFloat(nativeBalance) - 1;
            const currentGatewayBalance = parseFloat(gatewayBalance || '0');
            
            const newNativeBalance = 1.00;
            const newGatewayBalance = currentGatewayBalance + amountToDeposit;

            setNativeBalance(newNativeBalance.toFixed(2));
            setGatewayBalance(newGatewayBalance.toFixed(2));

            setIsDepositing(false);
            toast({
                title: 'Deposit Successful!',
                description: `Transaction confirmed. Balances updated.`,
            });
        }, 4000); // 4-second delay to simulate transaction time
    };

     const handleTransferFromGateway = async () => {
        const amount = parseFloat(transferAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid amount to transfer.', variant: 'destructive' });
            return;
        }
        if (!gatewayBalance || amount > parseFloat(gatewayBalance)) {
            toast({ title: 'Insufficient Balance', description: 'Your gateway balance is too low.', variant: 'destructive' });
            return;
        }

        setIsTransferring(true);
        toast({ title: 'Transfer Initiated', description: `Sending ${amount} USDC to ${destinationChain}...` });

        // Simulate transfer delay
        setTimeout(() => {
            const currentGatewayBalance = parseFloat(gatewayBalance);
            const newGatewayBalance = currentGatewayBalance - amount;
            setGatewayBalance(newGatewayBalance.toFixed(2));

            setIsTransferring(false);
            setTransferAmount('');
            toast({ title: 'Transfer Successful!', description: `${amount} USDC has been sent.` });
        }, 5000); // 5-second delay
    };


    const copyToClipboard = () => {
        if (userProfile?.walletAddress) {
            navigator.clipboard.writeText(userProfile.walletAddress);
            toast({ title: 'Copied!', description: 'Wallet address copied to clipboard.' });
        }
    };

    const handleExportPrivateKey = () => {
        if (userProfile?.privateKey) {
            const privateKey = userProfile.privateKey;
            const blob = new Blob([JSON.stringify({
                address: userProfile.walletAddress,
                privateKey: privateKey
            }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${userProfile.walletAddress}_keystore.json`;
            document.body.appendChild(a);
a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: "Key Exported", description: "Your private key has been downloaded." });
        } else {
            toast({ title: "Export Failed", description: "Could not find the private key.", variant: 'destructive' });
        }
    };
    
    const isLoading = isUserLoading || isProfileLoading;

    return (
        <div className="container mx-auto max-w-2xl p-4">
            <Card className="border-0 shadow-none bg-transparent">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl" style={{ color: 'hsl(var(--primary))' }}>
                        My ARC Wallet
                    </CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Your personal ARC Testnet wallet address and USDC balances.
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-xl">
                        <Wallet className="h-6 w-6"/>
                        Wallet Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <>
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-10 w-1/2" />
                            <Skeleton className="h-10 w-1/2" />
                        </>
                    ) : userProfile ? (
                         <>
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">Wallet Address (ARC Testnet)</h3>
                                <div className="flex items-center gap-2">
                                     <p className="font-mono text-lg break-all">{userProfile.walletAddress}</p>
                                     <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                                        <Copy className="h-5 w-5"/>
                                    </Button>
                                </div>
                            </div>
                             <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Native USDC Balance</h3>
                                    {isLoadingBalance ? (
                                        <Skeleton className="h-10 w-1/3" />
                                    ) : (
                                        <p className="text-3xl font-bold">{nativeBalance} USDC</p>
                                    )}
                                </div>
                                 <Button 
                                    onClick={handleDepositToGateway} 
                                    disabled={isDepositing || isLoadingBalance || !nativeBalance || parseFloat(nativeBalance) <= 1}
                                    className="w-full"
                                >
                                    {isDepositing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <ArrowRight className="mr-2 h-4 w-4" />
                                    )}
                                    Deposit to Gateway (Keeps 1 USDC for gas)
                                </Button>
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4" />
                                        Unified Gateway Balance
                                    </h3>
                                    {isLoadingBalance ? (
                                        <Skeleton className="h-10 w-1/3" />
                                    ) : (
                                        <p className="text-3xl font-bold">{gatewayBalance} USDC</p>
                                    )}
                                </div>
                            </div>
                            <Separator />
                             <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <ArrowLeftRight className="h-5 w-5" />
                                    Transfer from Gateway
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        disabled={isTransferring}
                                    />
                                    <Select value={destinationChain} onValueChange={setDestinationChain} disabled={isTransferring}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Destination" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ethereum">Ethereum</SelectItem>
                                            <SelectItem value="polygon">Polygon</SelectItem>
                                            <SelectItem value="avalanche">Avalanche</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleTransferFromGateway} disabled={isTransferring || !gatewayBalance || parseFloat(gatewayBalance) <= 0} className="w-full">
                                    {isTransferring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Transfer
                                </Button>
                            </div>

                            <Separator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full">
                                        <Download className="mr-2 h-4 w-4" /> Export Private Key
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="flex items-center gap-2">
                                            <AlertTriangle className="h-6 w-6 text-yellow-400" />
                                            EXTREME Security Warning
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            You are about to download your UNENCRYPTED private key. Anyone with this key will have full control of your funds. NEVER share it. This feature is for development purposes ONLY and is extremely insecure.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleExportPrivateKey}>
                                            I understand the risk, export
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    ) : (
                        <div className="text-center p-8 text-muted-foreground">
                           <p>Please log in to view your wallet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
