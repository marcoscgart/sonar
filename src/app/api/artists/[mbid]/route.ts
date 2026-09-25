import { NextResponse } from 'next/server';
import { getMusicBrainzArtistDetails } from '@/lib/services/musicbrainz';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mbid: string }> }
) {
  const { mbid } = await params;
  if (!mbid) {
    return NextResponse.json({ error: 'Missing MBID parameter' }, { status: 400 });
  }

  const artistDetails = await getMusicBrainzArtistDetails(mbid);
  return NextResponse.json(artistDetails);
}
