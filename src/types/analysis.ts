export interface AnalysisResult {
  radiograph_type?: string;
  inference_version?: string;
  teeth?: Array<{
    id?: number;
    tooth_id?: number;
    polygon: number[][];
    tooth_number?: number;
    confidence?: number;
  }>;
  diseases?: Array<{
    id?: number;
    disease_id?: number;
    polygon: number[][];
    disease_type?: string;
    type?: string;
    tooth_id?: number;
    confidence?: number;
  }>;
}

// Generate a consistent color for teeth based on ID
export const getToothColor = (id: number): string => {
  const colors = [
    'rgba(34, 197, 94, 0.3)',   // green-500
    'rgba(22, 163, 74, 0.3)',   // green-600
    'rgba(21, 128, 61, 0.3)',   // green-700
    'rgba(74, 222, 128, 0.3)',  // green-400
    'rgba(16, 185, 129, 0.3)',  // emerald-500
    'rgba(5, 150, 105, 0.3)',   // emerald-600
  ];
  return colors[id % colors.length];
};

// Get disease-specific colors based on type
export const getDiseaseColor = (diseaseType: string | undefined): { fill: string; stroke: string } => {
  if (!diseaseType) {
    return {
      fill: 'rgba(239, 68, 68, 0.55)',
      stroke: 'rgba(220, 38, 38, 1)',
    };
  }

  const type = diseaseType.toLowerCase().replace(/\s+/g, '_');

  if (type === 'caries') {
    return {
      fill: 'rgba(249, 115, 22, 0.55)',    // orange-500
      stroke: 'rgba(234, 88, 12, 1)',       // orange-600
    };
  }

  if (type.includes('apical') || type.includes('lesion')) {
    return {
      fill: 'rgba(239, 68, 68, 0.55)',     // red-500
      stroke: 'rgba(220, 38, 38, 1)',       // red-600
    };
  }

  return {
    fill: 'rgba(239, 68, 68, 0.55)',
    stroke: 'rgba(220, 38, 38, 1)',
  };
};
