import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Eye, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleServiceAttemptsProps {
  serviceAttempts: any[];
  expandedAttempts: Set<number>;
  toggleAttemptExpansion: (attemptId: number) => void;
  formatDateTime: (date: string) => string;
  formatFileSize: (size: number) => string;
  setSelectedPhoto: (photo: any) => void;
}

export const CollapsibleServiceAttempts: React.FC<CollapsibleServiceAttemptsProps> = ({
  serviceAttempts,
  expandedAttempts,
  toggleAttemptExpansion,
  formatDateTime,
  formatFileSize,
  setSelectedPhoto
}) => {
  return (
    <>
      {serviceAttempts.map((attempt: any) => {
        const isExpanded = expandedAttempts.has(attempt.id);
        
        return (
          <div key={attempt.id} className="border rounded-lg p-4">
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-4 p-4 rounded-lg"
              onClick={() => toggleAttemptExpansion(attempt.id)}
            >
              <div className="flex items-center space-x-3">
                <div className="text-gray-500">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
                <h4 className="font-medium text-lg">Attempt #{attempt.number}</h4>
                <Badge className={attempt.statusColor}>
                  {attempt.status}
                </Badge>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{formatDateTime(attempt.date)}</p>
                <div className="flex items-center text-sm text-gray-600">
                  {attempt.server || 'Unknown Server'}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-4 border-t pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Serve Type</label>
                    <p className="text-sm text-gray-900">{attempt.details?.serveType || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Service Status</label>
                    <p className="text-sm text-gray-900">{attempt.details?.serviceStatus || attempt.status || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Recipient</label>
                    <p className="text-sm text-gray-900">{attempt.details?.recipient || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="text-sm text-gray-900">{attempt.details?.address || 'N/A'}</p>
                  </div>
                </div>

                {attempt.details?.description && attempt.details.description !== 'No additional details' && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Service Description</label>
                    <div className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-md">
                      {attempt.details?.description || attempt.notes || 'No description available'}
                    </div>
                  </div>
                )}

                {/* Attempt Photos - only in expanded view */}
                {attempt.details?.photos && attempt.details.photos.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Attempt Photos</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {attempt.details.photos.map((photo: any) => (
                        <div key={photo.id} className="border rounded-lg overflow-hidden group">
                          <div
                            className="relative cursor-pointer bg-gray-100"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <img
                              src={photo.url}
                              alt={photo.name}
                              loading="lazy"
                              className="w-full h-24 object-cover transition-transform group-hover:scale-105"
                              onLoad={(e) => {
                                // Remove loading background once image loads
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.classList.remove('bg-gray-100');
                                }
                              }}
                              onError={(e) => {
                                // Hide broken images and their container
                                const container = e.currentTarget.closest('.border');
                                if (container) {
                                  container.style.display = 'none';
                                }
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate" title={photo.name}>
                              {photo.name}
                            </p>
                            {photo.size && (
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(photo.size)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GPS Information */}
                {(attempt.details?.gps?.latitude || attempt.details?.gps?.longitude) && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">GPS Information</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Latitude</label>
                        <p className="text-sm text-gray-900">{attempt.details?.gps?.latitude || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Longitude</label>
                        <p className="text-sm text-gray-900">{attempt.details?.gps?.longitude || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">GPS Accuracy</label>
                        <p className="text-sm text-gray-900">{attempt.details?.gps?.accuracy || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">GPS Time</label>
                        <p className="text-sm text-gray-900">{attempt.details?.gps?.time ? formatDateTime(attempt.details.gps.time) : 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
