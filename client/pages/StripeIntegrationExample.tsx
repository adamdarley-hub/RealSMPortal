import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  FileText, 
  DollarSign, 
  CheckCircle, 
  Clock,
  Zap,
  User,
  Building,
  Phone,
  Mail,
  Info
} from "lucide-react";

// Import our Stripe Phase 6 components
import CardCollection, { PaymentMethodStatus } from '@/components/CardCollection';
import PaymentHistory, { PaymentStatus } from '@/components/PaymentHistory';
import AffidavitPaymentTrigger, { AutoPaymentTrigger } from '@/components/AffidavitPaymentTrigger';
import PaymentMethodManager from '@/components/PaymentMethodManager';

export default function StripeIntegrationExample() {
  // Job state simulation
  const [currentJob] = useState({
    id: '20589610',
    jobNumber: '13927894',
    clientName: 'Kelly Kerr',
    clientCompany: 'Kerr Civil Process',
    amount: 85.00,
    status: 'in_progress',
    hasAffidavit: true,
    affidavitSigned: false, // This would trigger payment when true
    createdAt: new Date().toISOString()
  });

  // Payment method state
  const [paymentMethodInfo, setPaymentMethodInfo] = useState<any>(null);
  const [customerId, setCustomerId] = useState<string>('');

  const handleCardSaved = (setupIntentId: string, newCustomerId: string) => {
    // In real implementation, this would fetch the actual payment method details
    setPaymentMethodInfo({
      setupIntentId,
      customerId: newCustomerId,
      paymentMethodId: 'pm_' + Math.random().toString(36).substr(2, 9),
      brand: 'Visa',
      last4: '4242'
    });
    setCustomerId(newCustomerId);
  };

  const handlePaymentProcessed = (paymentIntentId: string, amount: number) => {
    console.log('Payment processed:', paymentIntentId, amount);
    // In real implementation, this would update the job status
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Stripe Phase 6: Bill on Affidavit</h1>
        <p className="text-muted-foreground">
          Complete payment workflow demonstration - from card collection to affidavit-triggered billing
        </p>
      </div>

      {/* Job Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Job Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Job Number</p>
              <p className="font-mono">{currentJob.jobNumber}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Client</p>
              <p>{currentJob.clientName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="font-bold">${currentJob.amount}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant="outline" className="capitalize">
                <Clock className="w-3 h-3 mr-1" />
                {currentJob.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow Tabs */}
      <Tabs defaultValue="step1" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="step1" className="text-xs">
            1. Collect Card
          </TabsTrigger>
          <TabsTrigger value="step2" className="text-xs">
            2. Service Progress
          </TabsTrigger>
          <TabsTrigger value="step3" className="text-xs">
            3. Affidavit Billing
          </TabsTrigger>
          <TabsTrigger value="step4" className="text-xs">
            4. Payment History
          </TabsTrigger>
        </TabsList>

        {/* Step 1: Card Collection during Job Creation */}
        <TabsContent value="step1" className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Step 1: Card Collection</h2>
            <p className="text-muted-foreground">
              Collect payment information when the job is created. No charge is made yet.
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Bill on Affidavit Workflow:</strong> Payment method is collected and securely stored 
              using Stripe Setup Intents. No charge is made until the affidavit is signed.
            </AlertDescription>
          </Alert>

          {!paymentMethodInfo ? (
            <CardCollection
              jobId={currentJob.id}
              onCardSaved={handleCardSaved}
              onSkip={() => console.log('Skipped payment method collection')}
              stripe={null} // In real app, this comes from StripeProvider
            />
          ) : (
            <PaymentMethodStatus
              setupIntentId={paymentMethodInfo.setupIntentId}
              customerId={paymentMethodInfo.customerId}
              paymentMethodId={paymentMethodInfo.paymentMethodId}
              cardBrand={paymentMethodInfo.brand}
              cardLast4={paymentMethodInfo.last4}
              onRemove={() => setPaymentMethodInfo(null)}
            />
          )}
        </TabsContent>

        {/* Step 2: Service in Progress */}
        <TabsContent value="step2" className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Step 2: Service in Progress</h2>
            <p className="text-muted-foreground">
              Service is being performed. Payment method is ready but no charge has been made.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Service in Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Process server is working on serving the documents. 
                    Payment will be processed when the affidavit is signed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {paymentMethodInfo && (
            <PaymentMethodStatus
              setupIntentId={paymentMethodInfo.setupIntentId}
              customerId={paymentMethodInfo.customerId}
              paymentMethodId={paymentMethodInfo.paymentMethodId}
              cardBrand={paymentMethodInfo.brand}
              cardLast4={paymentMethodInfo.last4}
            />
          )}

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              The payment method is stored and ready. No charge will be made until the service 
              is completed and the affidavit is signed.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Step 3: Affidavit Signed - Trigger Payment */}
        <TabsContent value="step3" className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Step 3: Affidavit Signed</h2>
            <p className="text-muted-foreground">
              Service is complete and affidavit is signed. Process payment automatically.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Affidavit Signed ✓</h3>
                  <p className="text-sm text-muted-foreground">
                    Service has been completed successfully. The affidavit is signed and ready for billing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto Payment Trigger */}
          <AutoPaymentTrigger
            jobId={currentJob.id}
            hasAffidavit={currentJob.hasAffidavit}
            affidavitSigned={true} // Simulating signed affidavit
            jobAmount={currentJob.amount}
            paymentMethodInfo={paymentMethodInfo}
            onPaymentProcessed={handlePaymentProcessed}
            isAdmin={true} // Simulating admin user
          />

          {/* Or manual trigger for demo */}
          <AffidavitPaymentTrigger
            jobId={currentJob.id}
            jobAmount={currentJob.amount}
            hasStoredPaymentMethod={!!paymentMethodInfo}
            paymentMethodInfo={paymentMethodInfo}
            onPaymentProcessed={handlePaymentProcessed}
            showTrigger={true}
          />
        </TabsContent>

        {/* Step 4: Payment History */}
        <TabsContent value="step4" className="space-y-4">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Step 4: Payment Management</h2>
            <p className="text-muted-foreground">
              View payment history, process refunds, and manage payment methods.
            </p>
          </div>

          {/* Payment History */}
          <PaymentHistory
            jobId={currentJob.id}
            showRefundButton={true} // Admin can refund
            onRefund={(paymentId, amount) => console.log('Refunded:', paymentId, amount)}
          />

          {/* Payment Method Management */}
          {customerId && (
            <PaymentMethodManager
              customerId={customerId}
              jobId={currentJob.id}
              allowAdd={true}
              allowRemove={true}
              showDefaultBadge={true}
            />
          )}

          {/* Quick Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Quick Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentStatus jobId={currentJob.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Implementation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Implementation Summary
          </CardTitle>
          <CardDescription>
            Key features of the Bill on Affidavit payment system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Security & Compliance
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• PCI DSS compliant card storage via Stripe</li>
                <li>• Setup Intents for secure card collection</li>
                <li>• No charges until service completion</li>
                <li>• Encrypted payment method tokens</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Workflow Features
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Automatic billing on affidavit signing</li>
                <li>• Payment history tracking</li>
                <li>• Refund capabilities for admins</li>
                <li>• Customer payment method management</li>
              </ul>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This system ensures clients are only charged when services are successfully completed 
              and documented with a signed affidavit, providing transparency and trust in the billing process.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
