// // app/actions/wallet.ts

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Create Transaction PIN
 * Stores the PIN as plain text (not secure, only for dev/testing)
 */
export async function createTransactionPinAction(pin: string) {
  try {
    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      return { error: "PIN must be 4-6 digits" };
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Update profile with plain PIN
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ transaction_pin: pin })
      .eq("id", user.id);

    if (updateError) {
      console.error("PIN update error:", updateError);
      return { error: "Failed to save PIN" };
    }

    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error("Create PIN error:", error);
    return { error: "Something went wrong" };
  }
}

/**
 * Verify Transaction PIN
 */
export async function verifyTransactionPinAction(pin: string) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", valid: false };
    }

    // Fetch stored PIN
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("transaction_pin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.transaction_pin) {
      return { error: "PIN not set", valid: false };
    }

    const isValid = pin === profile.transaction_pin;

    if (!isValid) {
      return { error: "Incorrect PIN", valid: false };
    }

    return { success: true, valid: true };
  } catch (error) {
    console.error("Verify PIN error:", error);
    return { error: "Something went wrong", valid: false };
  }
}

/**
 * Get Wallet Balance
 */
export async function getWalletBalanceAction() {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized", balance: 0 };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Wallet balance error:", profileError);
      return { error: "Failed to fetch balance", balance: 0 };
    }

    return { success: true, balance: profile.wallet_balance || 0 };
  } catch (error) {
    console.error("Get wallet balance error:", error);
    return { error: "Something went wrong", balance: 0 };
  }
}

/**
 * Update Transaction PIN
 */
export async function updateTransactionPinAction(currentPin: string, newPin: string) {
  try {
    if (!/^\d{4,6}$/.test(newPin)) {
      return { error: "New PIN must be 4-6 digits" };
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    // Verify current PIN
    const verifyResult = await verifyTransactionPinAction(currentPin);
    if (!verifyResult.valid) {
      return { error: "Current PIN is incorrect" };
    }

    // Update to new PIN (plain text)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ transaction_pin: newPin })
      .eq("id", user.id);

    if (updateError) {
      console.error("PIN update error:", updateError);
      return { error: "Failed to update PIN" };
    }

    revalidatePath("/changepin");
    return { success: true };
  } catch (error) {
    console.error("Update PIN error:", error);
    return { error: "Something went wrong" };
  }
}


// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";
// import bcrypt from "bcryptjs"; // Install: npm install bcryptjs @types/bcryptjs

// /**
//  * Create Transaction PIN
//  * Hashes the PIN before storing it in the database
//  */
// export async function createTransactionPinAction(pin: string) {
//   try {
//     // Validate PIN format
//     if (!/^\d{4,6}$/.test(pin)) {
//       return { error: "PIN must be 4-6 digits" };
//     }

//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     // Hash PIN before storing (IMPORTANT for security)
//     const hashedPin = await bcrypt.hash(pin, 10);

//     // Update profile with hashed PIN
//     const { error: updateError } = await supabase
//       .from("profiles")
//       .update({ transaction_pin: hashedPin })
//       .eq("id", user.id);

//     if (updateError) {
//       console.error("PIN update error:", updateError);
//       return { error: "Failed to save PIN" };
//     }

//     // Revalidate home page to update UI
//     revalidatePath("/home");
    
//     return { success: true };
//   } catch (error) {
//     console.error("Create PIN error:", error);
//     return { error: "Something went wrong" };
//   }
// }

// /**
//  * Verify Transaction PIN
//  * Compares provided PIN with stored hashed PIN
//  */
// export async function verifyTransactionPinAction(pin: string) {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized", valid: false };
//     }

//     // Fetch stored hashed PIN
//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("transaction_pin")
//       .eq("id", user.id)
//       .single();

//     if (profileError || !profile?.transaction_pin) {
//       return { error: "PIN not set", valid: false };
//     }

//     // Compare provided PIN with hashed PIN
//     const isValid = await bcrypt.compare(pin, profile.transaction_pin);

//     if (!isValid) {
//       return { error: "Incorrect PIN", valid: false };
//     }

//     return { success: true, valid: true };
//   } catch (error) {
//     console.error("Verify PIN error:", error);
//     return { error: "Something went wrong", valid: false };
//   }
// }

// /**
//  * Get Wallet Balance
//  * Fetches user's wallet balance from profiles table
//  */
// export async function getWalletBalanceAction() {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized", balance: 0 };
//     }

//     const { data: profile, error: profileError } = await supabase
//       .from("profiles")
//       .select("wallet_balance")
//       .eq("id", user.id)
//       .single();

//     if (profileError) {
//       console.error("Wallet balance error:", profileError);
//       return { error: "Failed to fetch balance", balance: 0 };
//     }

//     return { success: true, balance: profile.wallet_balance || 0 };
//   } catch (error) {
//     console.error("Get wallet balance error:", error);
//     return { error: "Something went wrong", balance: 0 };
//   }
// }

// /**
//  * Update Transaction PIN
//  * Changes existing PIN to a new one
//  */
// export async function updateTransactionPinAction(
//   currentPin: string,
//   newPin: string
// ) {
//   try {
//     // Validate new PIN format
//     if (!/^\d{4,6}$/.test(newPin)) {
//       return { error: "New PIN must be 4-6 digits" };
//     }

//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     // Verify current PIN first
//     const verifyResult = await verifyTransactionPinAction(currentPin);
//     if (!verifyResult.valid) {
//       return { error: "Current PIN is incorrect" };
//     }

//     // Hash new PIN
//     const hashedNewPin = await bcrypt.hash(newPin, 10);

//     // Update with new hashed PIN
//     const { error: updateError } = await supabase
//       .from("profiles")
//       .update({ transaction_pin: hashedNewPin })
//       .eq("id", user.id);

//     if (updateError) {
//       console.error("PIN update error:", updateError);
//       return { error: "Failed to update PIN" };
//     }

//     revalidatePath("/changepin");
    
//     return { success: true };
//   } catch (error) {
//     console.error("Update PIN error:", error);
//     return { error: "Something went wrong" };
//   }
// }