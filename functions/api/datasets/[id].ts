/**
 * Cloudflare Pages Function: GET /api/datasets/:id
 * Returns a specific dataset with figures and references
 */

interface Env {}

export async function onRequestGet(context: { params: { id: string }; env: Env }) {
  const datasetId = context.params.id;

  const dataset = {
    datasetId,
    title: datasetId,
    description: 'Synthetic validator bundle used for the Carbon ACX preview environment.',
    generatedAt: new Date().toISOString(),
    figureCount: 1,
    figures: [
      {
        id: 'FIG.SECTOR_COVERAGE_OVERVIEW',
        title: 'Sector coverage overview',
        description: 'Abatement potential versus cost across the sample sectors.',
        figure_type: 'bubble',
        data: {
          id: 'sector-coverage-bubble',
          title: 'Estimated abatement potential',
          subtitle: 'Illustrative portfolio only',
          description: 'Each bubble represents a sector scenario; size reflects indicative capital investment (USD millions).',
          xAxis: { label: 'Abatement cost', unit: 'USD/tCO₂e' },
          yAxis: { label: 'Abatement potential', unit: 'MtCO₂e' },
          valueAxis: { label: 'Capital investment', unit: 'USD millions' },
          points: [
            { id: 'power', label: 'Power', x: 25, y: 310, value: 420, description: 'Grid decarbonisation package.' },
            { id: 'transport', label: 'Transport', x: 48, y: 180, value: 260, description: 'Fleet electrification mix.' },
            { id: 'industry', label: 'Industry', x: 62, y: 220, value: 310, description: 'Heat recovery retrofits.' },
            { id: 'buildings', label: 'Buildings', x: 18, y: 140, value: 150, description: 'Envelope upgrades and smart controls.' },
            { id: 'agriculture', label: 'Agriculture', x: 32, y: 90, value: 120, description: 'Regenerative practices pilots.' },
          ],
        },
      },
    ],
  };

  const references = [
    {
      id: '1',
      citation: 'Canadian Urban Transit Association, "Ontario Urban Operating Data: Toronto," 2018.',
      url: 'https://raw.githubusercontent.com/...',
    },
    {
      id: '2',
      citation: 'Demo: "Demonstration placeholder," https://example.org/demo.',
      url: 'https://example.org/demo',
    },
  ];

  return new Response(JSON.stringify({ dataset, references }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
