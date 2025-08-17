import { BuilderComponent, builder } from '@builder.io/react';
import { useParams } from 'react-router-dom';
import { useBuilder } from '../contexts/BuilderContext';
import Layout from '../components/Layout';

// Initialize builder with your API key
builder.init(import.meta.env.VITE_PUBLIC_BUILDER_KEY || 'a0b2fe3b0e09431caaa97bd8f93a665d');

export default function BuilderPage() {
  const { slug } = useParams();
  const { isEditMode } = useBuilder();

  // Use the slug from the URL, or default to 'home' for the root page
  const urlPath = slug ? `/${slug}` : '/';

  return (
    <div className="min-h-screen">
      {isEditMode ? (
        // In edit mode, render the component directly for Builder.io editor
        <BuilderComponent 
          model="page" 
          content={undefined}
          options={{ includeRefs: true }}
        />
      ) : (
        // In regular mode, wrap with layout
        <Layout>
          <BuilderComponent 
            model="page" 
            content={undefined}
            options={{ includeRefs: true }}
          />
        </Layout>
      )}
    </div>
  );
}
