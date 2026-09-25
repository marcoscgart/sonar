import { NextResponse } from 'next/server';
import { generateDiscoveryCandidates } from '@/lib/services/discoveryEngine';
import { UserArtist } from '@/lib/types/sonar';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const seeds: UserArtist[] = body.seeds || [];
    const dislikedIds = new Set<string>(body.dislikedIds || []);
    const knownIds = new Set<string>(body.knownIds || []);

    const discoveries = await generateDiscoveryCandidates(seeds, dislikedIds, knownIds);

    return NextResponse.json({ discoveries });
  } catch (error) {
    console.error('API discoveries error:', error);
    return NextResponse.json({ discoveries: [] }, { status: 500 });
  }
}
