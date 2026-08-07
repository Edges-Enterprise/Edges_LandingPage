// src/lib/providers/lizzysub.ts
import {
  ServiceProvider,
  PurchaseDataParams,
  PurchaseDataResult,
  GetPlansParams,
  Plan,
} from "./provider.types";

const LIZZYSUB_BASE_URL =
  process.env.LIZZYSUB_BASE_URL || "https://api.lizzysub.com";
const LIZZYSUB_API_KEY = process.env.LIZZYSUB_API_KEY || "";
const LIZZYSUB_SECRET_KEY = process.env.LIZZYSUB_SECRET_KEY || "";

function getHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${LIZZYSUB_SECRET_KEY}`,
    "api-key": LIZZYSUB_API_KEY,
    "Content-Type": "application/json",
  };
}

function generateReference(prefix: string = "LZY"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

export const lizzysub: ServiceProvider = {
  /**
   * Purchase data or airtime from Lizzysub
   * Nigeria only
   */
  async purchaseData(params: PurchaseDataParams): Promise<PurchaseDataResult> {
    try {
      const {
        resellerId,
        planId,
        phoneNumber,
        amount,
        network,
        countryCode,
        metadata,
      } = params;

      const reference = generateReference("LZY");

      const payload = {
        reference,
        plan_id: planId,
        phone_number: phoneNumber,
        amount,
        network: network || "MTN",
        metadata: {
          reseller_id: resellerId,
          country_code: countryCode,
          ...metadata,
        },
      };

      const response = await fetch(`${LIZZYSUB_BASE_URL}/api/v1/purchase`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status === "failed") {
        return {
          success: false,
          reference,
          status: "failed",
          error: data.message || "Purchase failed",
        };
      }

      return {
        success: true,
        reference,
        providerReference:
          data.data?.reference || data.data?.transaction_id || "",
        status: data.data?.status === "completed" ? "completed" : "pending",
        metadata: data.data,
      };
    } catch (error) {
      console.error("Lizzysub purchaseData error:", error);
      return {
        success: false,
        reference: generateReference("LZY"),
        status: "failed",
        error: error instanceof Error ? error.message : "Purchase failed",
      };
    }
  },

  /**
   * Get available plans from Lizzysub
   */
  async getPlans(params: GetPlansParams): Promise<{
    success: boolean;
    data?: Plan[];
    error?: string;
  }> {
    try {
      const { resellerId, countryCode, category, network } = params;

      const queryParams = new URLSearchParams();
      if (category) queryParams.append("category", category);
      if (network) queryParams.append("network", network);

      const response = await fetch(
        `${LIZZYSUB_BASE_URL}/api/v1/plans?${queryParams.toString()}`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok || data.status === "failed") {
        return {
          success: false,
          error: data.message || "Failed to fetch plans",
        };
      }

      const plans = (data.data || []).map((plan: any) => ({
        id: plan.id || plan.plan_id,
        name: plan.name || plan.plan_name,
        description: plan.description,
        price: plan.price || plan.selling_price || 0,
        cost: plan.cost || plan.base_price || 0,
        profit:
          (plan.price || plan.selling_price || 0) -
          (plan.cost || plan.base_price || 0),
        category: plan.category || "data",
        network: plan.network,
        dataAmount: plan.data_amount,
        validity: plan.validity,
        isActive: plan.is_active !== false,
        metadata: plan.metadata,
      }));

      return {
        success: true,
        data: plans,
      };
    } catch (error) {
      console.error("Lizzysub getPlans error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch plans",
      };
    }
  },

  /**
   * Get transaction status from Lizzysub
   */
  async getTransactionStatus(reference: string): Promise<{
    status: "pending" | "completed" | "failed";
    providerReference?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${LIZZYSUB_BASE_URL}/api/v1/transaction/${reference}`,
        {
          method: "GET",
          headers: getHeaders(),
        },
      );

      const data = await response.json();

      if (!response.ok || data.status === "failed") {
        return {
          status: "failed",
          error: data.message || "Transaction not found",
        };
      }

      const statusMap: Record<string, "pending" | "completed" | "failed"> = {
        pending: "pending",
        processing: "pending",
        completed: "completed",
        success: "completed",
        failed: "failed",
        error: "failed",
      };

      return {
        status: statusMap[data.data?.status] || "pending",
        providerReference: data.data?.reference || data.data?.transaction_id,
      };
    } catch (error) {
      console.error("Lizzysub getTransactionStatus error:", error);
      return {
        status: "failed",
        error: error instanceof Error ? error.message : "Failed to get status",
      };
    }
  },
};
