import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApiTest() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testEndpoint = async (url: string, name: string) => {
    const startTime = Date.now();
    try {
      console.log(`Testing ${name}: ${url}`);
      const response = await fetch(url);
      const duration = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        setResults(prev => [...prev, {
          name,
          url,
          status: 'SUCCESS',
          duration,
          data: JSON.stringify(data).substring(0, 200) + '...'
        }]);
      } else {
        setResults(prev => [...prev, {
          name,
          url,
          status: 'ERROR',
          duration,
          data: `HTTP ${response.status}`
        }]);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      setResults(prev => [...prev, {
        name,
        url,
        status: 'FAILED',
        duration,
        data: error.message
      }]);
    }
  };

  const runTests = async () => {
    setLoading(true);
    setResults([]);
    
    const testUrls = [
      ['/api/jobs?limit=5', 'Jobs List'],
      ['/api/jobs/20589610', 'Job Detail'],
      ['/api/servemanager/jobs/20589610', 'ServeManager Job'],
      ['/api/jobs/20589610/invoices', 'Job Invoices'],
      ['/api/jobs/20589610/affidavits', 'Job Affidavits'],
      ['/api/clients', 'Clients'],
    ];

    for (const [url, name] of testUrls) {
      await testEndpoint(url, name);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Endpoint Test</CardTitle>
          <CardDescription>
            Test all API endpoints to debug fetch issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={runTests} disabled={loading}>
            {loading ? 'Testing...' : 'Run API Tests'}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className={`p-3 rounded border ${
                  result.status === 'SUCCESS' ? 'bg-green-50 border-green-200' :
                  result.status === 'ERROR' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <strong>{result.name}</strong>
                    <span className={`px-2 py-1 rounded text-xs ${
                      result.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                      result.status === 'ERROR' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.status} ({result.duration}ms)
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {result.url}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.data}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
