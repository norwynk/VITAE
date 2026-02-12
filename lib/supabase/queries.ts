import { createClient } from '@/lib/supabase/server';
import type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  HealthBaseline,
  HealthBaselineInsert,
  HealthBaselineUpdate,
  DailyCheckinInsert,
  DailyCheckin,
} from '@/types/database';

/**
 * Get a user's profile by their ID
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Create or update a user's profile
 */
export async function upsertProfile(
  data: ProfileInsert | ProfileUpdate
): Promise<Profile | null> {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(data, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting profile:', error);
    return null;
  }

  return profile;
}

/**
 * Get a user's health baseline by their ID
 */
export async function getHealthBaseline(
  userId: string
): Promise<HealthBaseline | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('health_baseline')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching health baseline:', error);
    return null;
  }

  return data;
}

/**
 * Create or update a user's health baseline
 */
export async function upsertHealthBaseline(
  data: HealthBaselineInsert | HealthBaselineUpdate
): Promise<HealthBaseline | null> {
  const supabase = await createClient();

  const { data: baseline, error } = await supabase
    .from('health_baseline')
    .upsert(data, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting health baseline:', error);
    return null;
  }

  return baseline;
}

/**
 * Create a new daily check-in
 */
export async function createDailyCheckin(
  data: DailyCheckinInsert
): Promise<DailyCheckin | null> {
  const supabase = await createClient();

  const { data: checkin, error } = await supabase
    .from('daily_checkins')
    .insert(data)
    .select()
    .single();

  if (error) {
    console.error('Error creating daily check-in:', error);
    return null;
  }

  return checkin;
}

/**
 * Get all daily check-ins for a user
 */
export async function getDailyCheckins(
  userId: string,
  limit = 30
): Promise<DailyCheckin[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching daily check-ins:', error);
    return [];
  }

  return data || [];
}

/**
 * Get the most recent daily check-in for a user
 */
export async function getLatestDailyCheckin(
  userId: string
): Promise<DailyCheckin | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching latest daily check-in:', error);
    return null;
  }

  return data;
}
