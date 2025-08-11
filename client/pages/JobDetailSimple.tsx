import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Job } from "@shared/servemanager";

// Helper function to get preview URL using generic proxy
const getPreviewUrl = (downloadUrl: string): string => {
  if (!downloadUrl) return '';
  const encodedUrl = encodeURIComponent(downloadUrl);
  return `/api/proxy?url=${encodedUrl}&preview=true`;
};

export default function JobDetailSimple() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load job data
  useEffect(() => {
    const loadJob = async () => {
      if (!id) {
        setError("No job ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/jobs/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load job: ${response.status}`);
        }

        const jobData = await response.json();
        setJob(jobData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load job';
        setError(errorMessage);
        console.error('Error loading job:', error);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id, toast]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading job details...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !job) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold">Job Not Found</h3>
            <p className="text-muted-foreground">{error || 'The requested job could not be found.'}</p>
            <Button onClick={() => navigate('/jobs')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Get the document to display
  const documentsToBeServed = job.raw_data?.documents_to_be_served || job.documents_to_be_served || [];
  
  if (documentsToBeServed.length === 0) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center space-y-4">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No Documents</h3>
            <p className="text-muted-foreground">No documents to be served for this job.</p>
            <Button onClick={() => navigate('/jobs')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentDocument = documentsToBeServed[0];

  return (
    <Layout>
      <div className="h-screen flex flex-col">
        {/* Simple header */}
        <div className="p-4 border-b bg-white">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/jobs')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Button>
            <h1 className="text-xl font-semibold">
              {job.job_number || job.generated_job_id} - {job.client_company || job.client_name}
            </h1>
          </div>
        </div>
        
        {/* PDF Viewer */}
        <div className="flex-1">
          {currentDocument.upload?.links?.download_url && (
            <iframe
              src={getPreviewUrl(currentDocument.upload.links.download_url)}
              className="w-full h-full border-0"
              title={`Document: ${currentDocument.title}`}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
