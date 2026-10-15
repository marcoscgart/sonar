import { NextResponse } from 'next/server';
import { resolveAndGetArtistDetails } from '@/lib/services/musicbrainz';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Missing artist name parameter' }, { status: 400 });
  }

  const country = searchParams.get('country');
  const genres = searchParams.get('genres')?.split(',').filter(Boolean);
  const tags = searchParams.get('tags')?.split(',').filter(Boolean);

  const artistDetails = await resolveAndGetArtistDetails(name, {
    country,
    genres,
    tags,
  });

  return NextResponse.json(artistDetails);
}
