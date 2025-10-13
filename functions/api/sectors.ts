/**
 * Cloudflare Pages Function: GET /api/sectors
 * Returns list of all sectors
 */

export async function onRequestGet() {
  // Mock data - replace with actual data from your backend
  const sectors = [
    { id: 'earth-systems', name: 'Earth systems', description: 'Climate, weather, and natural cycles' },
    { id: 'defence-industrial', name: 'Defence (industrial)', description: 'Defence manufacturing and supply' },
    { id: 'industrial-energy', name: 'Industrial (energy)', description: 'Energy-intensive industry' },
    { id: 'industrial-land-use', name: 'Industrial (land use)', description: 'Agriculture and forestry' },
    { id: 'weapons-manufacture', name: 'Weapons manufacture', description: 'Arms production' },
    { id: 'military-operations', name: 'Military operations', description: 'Active military activities' },
    { id: 'defence-support', name: 'Defence support', description: 'Military logistics' },
    { id: 'online-services', name: 'Online services', description: 'Digital infrastructure' },
    { id: 'private-sector', name: 'Private sector', description: 'Commercial activities' },
    { id: 'professional-services', name: 'Professional services', description: 'Consulting and advisory' },
  ];

  return new Response(JSON.stringify({ sectors }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
