/**
 * Cohort Facts API Endpoint
 * 
 * Returns cohort facts alongside readiness evaluation for dashboard gating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildCohortFactsWithReadiness } from '@/lib/reduce/build-cohort-facts-with-readiness';
import type { SessionFacts } from '@/types/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/cohort-facts
 * 
 * Query params:
 * - programId: Optional program ID to filter sessions
 * - minPaired: Optional override for minimum paired surveys (readiness config)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get('programId') || undefined;
    
    // Parse optional readiness config overrides from query params
    const minPaired = searchParams.get('minPaired');
    const readinessConfig = minPaired ? {
      cohort: { minPairedSurveys: parseInt(minPaired, 10) },
    } : undefined;
    
    // TODO: Replace with actual session data fetching from database
    // For now, this is a placeholder showing the API shape
    const sessions: SessionFacts[] = await fetchSessionsFromDatabase(programId);
    
    if (sessions.length === 0) {
      return NextResponse.json(
        {
          error: 'No session data available',
          readiness: null,
          facts: null,
        },
        { status: 404 }
      );
    }
    
    // Build cohort facts with readiness
    const result = buildCohortFactsWithReadiness(sessions, {
      programId,
      readinessConfig,
    });
    
    return NextResponse.json({
      facts: result.facts,
      readiness: result.readiness,
      meta: {
        timestamp: new Date().toISOString(),
        programId: result.facts.programId,
        sessionCount: result.facts.nSessions,
      },
    });
  } catch (error) {
    console.error('Error building cohort facts:', error);
    
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to build cohort facts',
        readiness: null,
        facts: null,
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch sessions from database
 * 
 * TODO: Implement actual database fetching logic
 */
async function fetchSessionsFromDatabase(programId?: string): Promise<SessionFacts[]> {
  // Placeholder: In production, fetch from Prisma/Supabase
  // For now, return empty array to show API structure
  return [];
}

