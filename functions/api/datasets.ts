/**
 * Cloudflare Pages Function: GET /api/datasets
 * Returns list of all datasets
 */

export async function onRequestGet() {
  // Mock data - replace with actual data from your backend
  const datasets = [
    {
      datasetId: '5DA3067474C0',
      generatedAt: new Date().toISOString(),
      figureCount: 5,
      sectorId: 'professional-services',
    },
  ];

  return new Response(JSON.stringify({ datasets }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
