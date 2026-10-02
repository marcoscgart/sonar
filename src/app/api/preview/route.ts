import { NextResponse } from 'next/server';
import { fetchArtistPreviews } from '@/lib/services/itunes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artist = searchParams.get('artist');

  if (!artist) {
    return NextResponse.json({ error: 'Missing artist parameter' }, { status: 400 });
  }

  const genres = (searchParams.get('genres') || '').split(',').filter(Boolean);
  const previews = await fetchArtistPreviews(artist, genres);
  return NextResponse.json(previews);
}
