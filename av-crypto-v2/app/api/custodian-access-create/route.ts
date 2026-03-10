import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(`[POST] Attempting to create custodian access:`, body);
    
    const { data, error } = await supabaseAdmin
      .from("custodian_access")
      .insert(body)
      .select()
      .single();

    console.log(`[POST] Create result:`, { data, error });

    if (error) {
      console.error("Error creating custodian access:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log(`[POST] Successfully created custodian access`);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Fatal error creating custodian access:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}