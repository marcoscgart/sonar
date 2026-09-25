import { NextResponse } from 'next/server';
import { searchMusicBrainzArtists } from '@/lib/services/musicbrainz';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ artists: [] });
  }

  const artists = await searchMusicBrainzArtists(query);
  return NextResponse.json({ artists });
}
