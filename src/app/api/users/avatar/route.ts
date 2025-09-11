import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    // Verify the user's token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Get the avatar URL from request body
    const { avatarUrl } = await request.json();

    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return NextResponse.json({ error: 'Avatar URL is required' }, { status: 400 });
    }

    // Update user avatar in database
    try {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { avatar: avatarUrl },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true
        }
      });

      return NextResponse.json({ 
        success: true, 
        user: updatedUser 
      });

    } catch (dbError) {
      console.error('Database error updating avatar:', dbError);
      
      // If user doesn't exist, create them with avatar
      if (dbError instanceof Error && dbError.message.includes('Record to update not found')) {
        const newUser = await prisma.user.create({
          data: {
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || null,
            avatar: avatarUrl,
            role: 'USER'
          },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            role: true
          }
        });

        return NextResponse.json({ 
          success: true, 
          user: newUser 
        });
      }

      throw dbError;
    }

  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json(
      { error: 'Failed to update avatar' },
      { status: 500 }
    );
  }
}
