import { NextResponse } from 'next/server';
import { fetchArtistPreview } from '@/lib/services/itunes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');

  if (!artist) {
    return NextResponse.json({ error: 'Missing artist parameter' }, { status: 400 });
  }

  const preview = await fetchArtistPreview(artist);
  return NextResponse.json(preview || null);
}
