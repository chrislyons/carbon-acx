/**
 * Cloudflare Pages Function: GET /api/sectors/:id
 * Returns a specific sector and its activities
 */

interface Env {}

export async function onRequestGet(context: { params: { id: string }; env: Env }) {
  const sectorId = context.params.id;

  const sectors: Record<string, any> = {
    'earth-systems': { id: 'earth-systems', name: 'Earth systems', description: 'Climate, weather, and natural cycles' },
    'defence-industrial': { id: 'defence-industrial', name: 'Defence (industrial)', description: 'Defence manufacturing and supply' },
    'industrial-energy': { id: 'industrial-energy', name: 'Industrial (energy)', description: 'Energy-intensive industry' },
    'industrial-land-use': { id: 'industrial-land-use', name: 'Industrial (land use)', description: 'Agriculture and forestry' },
    'weapons-manufacture': { id: 'weapons-manufacture', name: 'Weapons manufacture', description: 'Arms production' },
    'military-operations': { id: 'military-operations', name: 'Military operations', description: 'Active military activities' },
    'defence-support': { id: 'defence-support', name: 'Defence support', description: 'Military logistics' },
    'online-services': { id: 'online-services', name: 'Online services', description: 'Digital infrastructure' },
    'private-sector': { id: 'private-sector', name: 'Private sector', description: 'Commercial activities' },
    'professional-services': { id: 'professional-services', name: 'Professional services', description: 'Consulting and advisory' },
  };

  const sector = sectors[sectorId];

  if (!sector) {
    return new Response(JSON.stringify({ error: 'Sector not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Mock activities for the sector
  const activities = [
    {
      id: `${sectorId}-activity-1`,
      name: 'Travel (commute, car, work)',
      category: 'Transport',
      sectorId,
    },
    {
      id: `${sectorId}-activity-2`,
      name: 'Travel (commute, transit, work)',
      category: 'Transport',
      sectorId,
    },
    {
      id: `${sectorId}-activity-3`,
      name: 'Electricity (office)',
      category: 'Energy',
      sectorId,
    },
  ];

  return new Response(JSON.stringify({ sector, activities }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
