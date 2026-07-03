// app/(reseller-dashboard)/wallet/WalletClient.tsx

"use client";
import { useEffect, useState, useRef } from "react";
import { Card } from "../Card";
import { Badge } from "../Badge";
import {
  formatNaira,
  calculateWithdrawalFee,
} from "@/lib/pricing/calculatePrice";
import type { ResellerWallet, Transaction } from "@/types";
import {
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet as WalletIcon,
  Copy,
  Check,
} from "lucide-react";
import {
  withdrawFunds,
  getBanks,
  verifyBankAccount,
} from "@/app/actions/reseller/wallet/withdrawFunds";

import {
  createResellerVirtualAccount,
  getResellerVirtualAccounts,
} from "@/app/actions/reseller/wallet/resellerCustomerWallet";
// Add this constant at the top of the component

const MIN_WITHDRAWAL_AMOUNT = 100;

export function WalletClient({
  resellerId,
  wallet,
  transactions,
}: {
  resellerId: string;
  wallet: ResellerWallet | null;
  transactions: Transaction[];
}) {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [currentBalance, setCurrentBalance] = useState(wallet?.balance || 0);

  const [banks, setBanks] = useState<
    Array<{ bankName: string; bankCode: string }>
  >([]);
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState<"amount" | "bank">("amount");

  // Virtual account states
  const [virtualAccounts, setVirtualAccounts] = useState<any[]>([]);
  const [showVirtualForm, setShowVirtualForm] = useState(false);
  const [virtualForm, setVirtualFormState] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
  });
  const [virtualLoading, setVirtualLoading] = useState(false);
  const [virtualMessage, setVirtualMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fee = amount ? calculateWithdrawalFee(Number(amount)) : 0;
  const netAmount = amount ? Number(amount) - fee : 0;

  // Ref for debounce timeout
  const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate withdrawable amount: balance + total_profit
  const withdrawableAmount =
    (wallet?.balance || 0) + (wallet?.total_sales || 0);

  // Fetch banks on mount
  useEffect(() => {
    async function fetchBanks() {
      const bankList = await getBanks();
      setBanks(bankList);
    }
    fetchBanks();
  }, []);

  // Fetch virtual accounts on mount
  useEffect(() => {
    async function fetchAccounts() {
      const accounts = await getResellerVirtualAccounts(resellerId);
      setVirtualAccounts(accounts || []);
    }
    fetchAccounts();
  }, [resellerId]);

  // Auto-verify when bank and account number are complete
  useEffect(() => {
    // Clear previous timeout
    if (verifyTimeoutRef.current) {
      clearTimeout(verifyTimeoutRef.current);
    }

    // Clear account name if inputs are incomplete
    if (!selectedBank || !accountNumber || accountNumber.length !== 10) {
      setAccountName("");
      setVerifying(false);
      return;
    }

    // Debounce verification by 600ms
    setVerifying(true);
    verifyTimeoutRef.current = setTimeout(async () => {
      const result = await verifyBankAccount(selectedBank, accountNumber);

      if (result.success && result.accountName) {
        setAccountName(result.accountName);
      } else {
        setAccountName("");
        // Only show error if the API returned a specific message
        if (result.error) {
          setMessage({ type: "error", text: result.error });
          // Clear error after 4 seconds
          setTimeout(() => setMessage(null), 4000);
        }
      }
      setVerifying(false);
    }, 600);

    return () => {
      if (verifyTimeoutRef.current) {
        clearTimeout(verifyTimeoutRef.current);
      }
    };
  }, [selectedBank, accountNumber]);

  const handleCreateVirtualAccount = async () => {
    setVirtualLoading(true);
    setVirtualMessage(null);

    const result = await createResellerVirtualAccount(resellerId);

    if (result.error) {
      setVirtualMessage({ type: "error", text: result.error });
    } else {
      setVirtualMessage({
        type: "success",
        text: result.message || "Virtual account created successfully!",
      });
      const accounts = await getResellerVirtualAccounts(resellerId);
      setVirtualAccounts(accounts || []);
    }
    setVirtualLoading(false);
  };

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return;
    if (!selectedBank || !accountNumber || !accountName) return;

    setLoading(true);
    setMessage(null);

    const result = await withdrawFunds({
      resellerId,
      amount: Number(amount),
      bankCode: selectedBank,
      accountNumber,
      accountName,
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setCurrentBalance(
        (prev) =>
          prev - Number(amount) - calculateWithdrawalFee(Number(amount)),
      );
      setAmount("");
      setSelectedBank("");
      setAccountNumber("");
      setAccountName("");
      setShowWithdraw(false);
      setWithdrawStep("amount");
      setMessage({
        type: "success",
        text: `Withdrawal of ${formatNaira(Number(amount))} initiated successfully!`,
      });
    }

    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.8rem",
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: "0.3rem",
          }}
        >
          Wallet
        </h1>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Your balance and transaction history
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "0.9rem 1.2rem",
            borderRadius: 10,
            background:
              message.type === "success"
                ? "rgba(110,189,138,0.1)"
                : "rgba(239,68,68,0.1)",
            border:
              message.type === "success"
                ? "1px solid rgba(110,189,138,0.25)"
                : "1px solid rgba(239,68,68,0.25)",
            color: message.type === "success" ? "#6EBD8A" : "#F87171",
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Virtual Account Section */}
      {virtualAccounts.length > 0 ? (
        <Card>
          <h2
            style={{
              fontWeight: 600,
              color: "var(--text)",
              fontSize: "1rem",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            💳 Your Virtual Account
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--dim)",
              marginBottom: "1rem",
            }}
          >
            Transfer money to this account and it will automatically fund your
            wallet.
          </p>
          {virtualAccounts.map((account: any, i: number) => (
            <div
              key={account.id}
              style={{
                background: "var(--bg2)",
                borderRadius: 10,
                padding: "1rem",
                marginBottom: i < virtualAccounts.length - 1 ? "0.5rem" : 0,
                border: "1px solid var(--border)",
              }}
            >
              <p
                style={{
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 4,
                }}
              >
                {account.bank_name}
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 2,
                }}
              >
                <p
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: "var(--accent-lt)",
                  }}
                >
                  {account.account_number}
                </p>
                <button
                  onClick={() => copyToClipboard(account.account_number)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--dim)",
                    cursor: "pointer",
                    padding: 2,
                  }}
                  title="Copy account number"
                >
                  <Copy size={14} />
                </button>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--dim)" }}>
                {account.account_name}
              </p>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
            {!showVirtualForm ? (
              <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  Get Your Virtual Account
                </p>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--muted)",
                    marginBottom: "1rem",
                  }}
                >
                  One-click setup. <em> Fund your wallet instantly</em>.
                </p>
                <button
                  onClick={handleCreateVirtualAccount}
                  disabled={virtualLoading}
                  style={{
                    padding: "0.6rem 1.5rem",
                    background: "var(--accent)",
                    border: "none",
                    borderRadius: 10,
                    color: "#FDF8F3",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    opacity: virtualLoading ? 0.7 : 1,
                  }}
                >
                  {virtualLoading ? "Creating..." : "Create Virtual Account →"}
                </button>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {/* Balance Card */}
      <Card
        style={{
          background: "linear-gradient(135deg, var(--card), var(--bg2))",
          border: "1px solid var(--border2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.8rem",
                color: "var(--dim)",
                marginBottom: 4,
              }}
            >
              Withdrawable Balance
            </p>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {formatNaira(withdrawableAmount)}
            </p>
          </div>
          <button
            onClick={() => {
              setShowWithdraw(!showWithdraw);
              setAmount("");
              setMessage(null);
            }}
            disabled={withdrawableAmount <= 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0.7rem 1.5rem",
              background: showWithdraw ? "var(--accent)" : "var(--bg2)",
              color: showWithdraw ? "#FDF8F3" : "var(--text)",
              border: showWithdraw ? "none" : "1px solid var(--border)",
              borderRadius: 10,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: withdrawableAmount <= 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              opacity: withdrawableAmount <= 0 ? 0.5 : 1,
            }}
          >
            <ArrowUpRight size={16} />
            Withdraw
          </button>
        </div>

        {/* Withdraw form */}
        {showWithdraw && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              background: "var(--bg2)",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            {withdrawStep === "amount" ? (
              <>
                <label style={labelStyle}>Withdrawal Amount</label>
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Enter amount (min. ₦${MIN_WITHDRAWAL_AMOUNT})`}
                      style={{
                        width: "100%",
                        padding: "0.7rem 1rem",
                        background: "var(--bg)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text)",
                        fontSize: "1rem",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                      min={MIN_WITHDRAWAL_AMOUNT}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const amountNum = Number(amount);
                      if (amountNum < MIN_WITHDRAWAL_AMOUNT) {
                        setMessage({
                          type: "error",
                          text: `Minimum withdrawal amount is ₦${MIN_WITHDRAWAL_AMOUNT}`,
                        });
                        return;
                      }
                      setWithdrawStep("bank");
                    }}
                    disabled={!amount || Number(amount) <= 99}
                    style={{
                      padding: "0.7rem 1.5rem",
                      background: "var(--accent)",
                      border: "none",
                      borderRadius: 10,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      opacity: !amount || Number(amount) <= 99 ? 0.5 : 1,
                    }}
                  >
                    Continue
                  </button>
                </div>
                {amount && Number(amount) > 0 && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.7rem 1rem",
                      background: "rgba(201,138,84,0.08)",
                      borderRadius: 8,
                      fontSize: "0.82rem",
                      color: "var(--accent-lt)",
                    }}
                  >
                    <p>
                      2% processing fee: <strong>{formatNaira(fee)}</strong>
                    </p>
                    <p>
                      You'll receive: <strong>{formatNaira(netAmount)}</strong>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Bank</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => {
                      setSelectedBank(e.target.value);
                      setAccountNumber("");
                      setAccountName("");
                    }}
                    style={{
                      ...inputStyle,
                      appearance: "auto",
                    }}
                  >
                    <option value="">Select bank</option>
                    {banks.map((bank) => (
                      <option key={bank.bankCode} value={bank.bankCode}>
                        {bank.bankName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={labelStyle}>Account Number</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        );
                      }}
                      placeholder="0123456789"
                      maxLength={10}
                      style={{
                        ...inputStyle,
                        paddingRight: verifying ? "2.5rem" : "0.8rem",
                      }}
                    />
                    {verifying && (
                      <div
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                        }}
                      >
                        <Loader2
                          size={16}
                          style={{
                            color: "var(--accent)",
                            animation: "spin 1s linear infinite",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification result */}
                {accountName && (
                  <div
                    style={{
                      padding: "0.6rem 0.8rem",
                      background: "rgba(110,189,138,0.1)",
                      border: "1px solid rgba(110,189,138,0.3)",
                      borderRadius: 8,
                      marginBottom: "1rem",
                      fontSize: "0.85rem",
                      color: "#6EBD8A",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Check size={16} />
                    {accountName}
                  </div>
                )}

                {/* No match found state */}
                {!verifying &&
                  !accountName &&
                  accountNumber.length === 10 &&
                  selectedBank && (
                    <div
                      style={{
                        padding: "0.6rem 0.8rem",
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 8,
                        marginBottom: "1rem",
                        fontSize: "0.82rem",
                        color: "#F87171",
                      }}
                    >
                      Could not verify account. Please check the details.
                    </div>
                  )}

                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.7rem 1rem",
                    background: "rgba(201,138,84,0.08)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    color: "var(--accent-lt)",
                    marginBottom: "1rem",
                  }}
                >
                  <p>
                    Amount: <strong>{formatNaira(Number(amount))}</strong>
                  </p>
                  <p>
                    Fee (2%): <strong>{formatNaira(fee)}</strong>
                  </p>
                  <p>
                    You'll receive: <strong>{formatNaira(netAmount)}</strong>
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={handleWithdraw}
                    disabled={loading || !accountName}
                    style={{
                      flex: 1,
                      padding: "0.7rem",
                      background: "var(--accent)",
                      border: "none",
                      borderRadius: 10,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      opacity: loading || !accountName ? 0.7 : 1,
                    }}
                  >
                    {loading && (
                      <Loader2
                        size={16}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                    )}
                    Confirm Withdrawal
                  </button>
                  <button
                    onClick={() => setWithdrawStep("amount")}
                    style={{
                      padding: "0.7rem 1rem",
                      background: "var(--bg2)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      color: "var(--muted)",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "1rem",
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
              Account Balance
            </p>
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {formatNaira(currentBalance)}
              {/* {formatNaira(wallet?.total_sales || 0)} */}
            </p>
          </div>
          <div>
            <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
              Total Profit
            </p>
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--green)",
              }}
            >
              {formatNaira(wallet?.total_profit || 0)}
            </p>
          </div>
        </div>
      </Card>

      {/* Transaction History */}
      <Card padding="none">
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2
            style={{ fontWeight: 600, color: "var(--text)", fontSize: "1rem" }}
          >
            Transaction History
          </h2>
        </div>
        {transactions.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--dim)",
            }}
          >
            <WalletIcon
              size={32}
              style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
            />
            <p>No transactions yet</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border)",
                    textAlign: "left",
                  }}
                >
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Amount</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "0.2rem 0.6rem",
                          borderRadius: 100,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          textTransform: "capitalize",
                          background:
                            tx.type === "deposit"
                              ? "rgba(110,189,138,0.12)"
                              : tx.type === "withdrawal"
                                ? "rgba(239,68,68,0.12)"
                                : "rgba(201,138,84,0.12)",
                          color:
                            tx.type === "deposit"
                              ? "#6EBD8A"
                              : tx.type === "withdrawal"
                                ? "#F87171"
                                : "var(--accent-lt)",
                        }}
                      >
                        {tx.type === "deposit" && <ArrowDownRight size={12} />}
                        {tx.type === "withdrawal" && <ArrowUpRight size={12} />}
                        {tx.type}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {tx.type === "deposit"
                        ? `+${formatNaira(tx.amount)}`
                        : `-${formatNaira(tx.amount)}`}
                    </td>
                    <td style={tdStyle}>
                      <Badge
                        variant={
                          tx.status === "completed"
                            ? "success"
                            : tx.status === "pending"
                              ? "warning"
                              : "error"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        color: "var(--dim)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {new Date(tx.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--muted)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.8rem",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text)",
  fontSize: "0.88rem",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--dim)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  fontSize: "0.88rem",
  color: "var(--text)",
};

// // app/(reseller-dashboard)/wallet/WalletClient.tsx

// "use client";
// import { useEffect, useState, useRef } from "react";
// import { Card } from "../Card";
// import { Badge } from "../Badge";
// import {
//   formatNaira,
//   calculateWithdrawalFee,
// } from "@/lib/pricing/calculatePrice";
// import type { ResellerWallet, Transaction } from "@/types";
// import {
//   Loader2,
//   ArrowUpRight,
//   ArrowDownRight,
//   Wallet as WalletIcon,
//   Copy,
//   Check,
// } from "lucide-react";
// import {
//   withdrawFunds,
//   getBanks,
//   verifyBankAccount,
// } from "@/app/actions/reseller/wallet/withdrawFunds";

// import {
//   createResellerVirtualAccount,
//   getResellerVirtualAccounts,
// } from "@/app/actions/reseller/wallet/resellerCustomerWallet";

// export function WalletClient({
//   resellerId,
//   wallet,
//   transactions,
// }: {
//   resellerId: string;
//   wallet: ResellerWallet | null;
//   transactions: Transaction[];
// }) {
//   const [showWithdraw, setShowWithdraw] = useState(false);
//   const [amount, setAmount] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState<{
//     type: "success" | "error";
//     text: string;
//   } | null>(null);
//   const [currentBalance, setCurrentBalance] = useState(wallet?.balance || 0);

//   const [banks, setBanks] = useState<
//     Array<{ bankName: string; bankCode: string }>
//   >([]);
//   const [selectedBank, setSelectedBank] = useState("");
//   const [accountNumber, setAccountNumber] = useState("");
//   const [accountName, setAccountName] = useState("");
//   const [verifying, setVerifying] = useState(false);
//   const [withdrawStep, setWithdrawStep] = useState<"amount" | "bank">("amount");

//   // Virtual account states
//   const [virtualAccounts, setVirtualAccounts] = useState<any[]>([]);
//   const [showVirtualForm, setShowVirtualForm] = useState(false);
//   const [virtualForm, setVirtualFormState] = useState({
//     fullName: "",
//     phoneNumber: "",
//     email: "",
//   });
//   const [virtualLoading, setVirtualLoading] = useState(false);
//   const [virtualMessage, setVirtualMessage] = useState<{
//     type: "success" | "error";
//     text: string;
//   } | null>(null);

//   const fee = amount ? calculateWithdrawalFee(Number(amount)) : 0;
//   const netAmount = amount ? Number(amount) - fee : 0;

//   // Ref for debounce timeout
//   const verifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

//   // Fetch banks on mount
//   useEffect(() => {
//     async function fetchBanks() {
//       const bankList = await getBanks();
//       setBanks(bankList);
//     }
//     fetchBanks();
//   }, []);

//   // Fetch virtual accounts on mount
//   useEffect(() => {
//     async function fetchAccounts() {
//       const accounts = await getResellerVirtualAccounts(resellerId);
//       setVirtualAccounts(accounts || []);
//     }
//     fetchAccounts();
//   }, [resellerId]);

//   // Auto-verify when bank and account number are complete
//   useEffect(() => {
//     // Clear previous timeout
//     if (verifyTimeoutRef.current) {
//       clearTimeout(verifyTimeoutRef.current);
//     }

//     // Clear account name if inputs are incomplete
//     if (!selectedBank || !accountNumber || accountNumber.length !== 10) {
//       setAccountName("");
//       setVerifying(false);
//       return;
//     }

//     // Debounce verification by 600ms
//     setVerifying(true);
//     verifyTimeoutRef.current = setTimeout(async () => {
//       const result = await verifyBankAccount(selectedBank, accountNumber);

//       if (result.success && result.accountName) {
//         setAccountName(result.accountName);
//       } else {
//         setAccountName("");
//         // Only show error if the API returned a specific message
//         if (result.error) {
//           setMessage({ type: "error", text: result.error });
//           // Clear error after 4 seconds
//           setTimeout(() => setMessage(null), 4000);
//         }
//       }
//       setVerifying(false);
//     }, 600);

//     return () => {
//       if (verifyTimeoutRef.current) {
//         clearTimeout(verifyTimeoutRef.current);
//       }
//     };
//   }, [selectedBank, accountNumber]);

//   // const handleCreateVirtualAccount = async () => {
//   //   if (
//   //     !virtualForm.fullName ||
//   //     !virtualForm.phoneNumber ||
//   //     !virtualForm.email
//   //   ) {
//   //     setVirtualMessage({ type: "error", text: "All fields are required" });
//   //     return;
//   //   }
//   //   setVirtualLoading(true);
//   //   setVirtualMessage(null);

//   //   const result = await createResellerVirtualAccount({
//   //     ...virtualForm,
//   //     resellerId,
//   //   });

//   //   if (result.error) {
//   //     setVirtualMessage({ type: "error", text: result.error });
//   //   } else {
//   //     setVirtualMessage({
//   //       type: "success",
//   //       text: result.message || "Virtual account created!",
//   //     });
//   //     setShowVirtualForm(false);
//   //     const accounts = await getResellerVirtualAccounts(resellerId);
//   //     setVirtualAccounts(accounts || []);
//   //   }
//   //   setVirtualLoading(false);
//   // };

//   const handleCreateVirtualAccount = async () => {
//     setVirtualLoading(true);
//     setVirtualMessage(null);

//     const result = await createResellerVirtualAccount(resellerId);

//     if (result.error) {
//       setVirtualMessage({ type: "error", text: result.error });
//     } else {
//       setVirtualMessage({
//         type: "success",
//         text: result.message || "Virtual account created successfully!",
//       });
//       const accounts = await getResellerVirtualAccounts(resellerId);
//       setVirtualAccounts(accounts || []);
//     }
//     setVirtualLoading(false);
//   };

//   const handleWithdraw = async () => {
//     if (!amount || Number(amount) <= 0) return;
//     if (!selectedBank || !accountNumber || !accountName) return;

//     setLoading(true);
//     setMessage(null);

//     const result = await withdrawFunds({
//       resellerId,
//       amount: Number(amount),
//       bankCode: selectedBank,
//       accountNumber,
//       accountName,
//     });

//     if (result.error) {
//       setMessage({ type: "error", text: result.error });
//     } else {
//       setCurrentBalance(
//         (prev) =>
//           prev - Number(amount) - calculateWithdrawalFee(Number(amount)),
//       );
//       setAmount("");
//       setSelectedBank("");
//       setAccountNumber("");
//       setAccountName("");
//       setShowWithdraw(false);
//       setWithdrawStep("amount");
//       setMessage({
//         type: "success",
//         text: `Withdrawal of ${formatNaira(Number(amount))} initiated successfully!`,
//       });
//     }

//     setLoading(false);
//   };

//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text);
//   };

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
//       {/* Header */}
//       <div>
//         <h1
//           style={{
//             fontFamily: "'Playfair Display', serif",
//             fontSize: "1.8rem",
//             fontWeight: 700,
//             color: "var(--text)",
//             marginBottom: "0.3rem",
//           }}
//         >
//           Wallet
//         </h1>
//         <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
//           Your balance and transaction history
//         </p>
//       </div>

//       {/* Message */}
//       {message && (
//         <div
//           style={{
//             padding: "0.9rem 1.2rem",
//             borderRadius: 10,
//             background:
//               message.type === "success"
//                 ? "rgba(110,189,138,0.1)"
//                 : "rgba(239,68,68,0.1)",
//             border:
//               message.type === "success"
//                 ? "1px solid rgba(110,189,138,0.25)"
//                 : "1px solid rgba(239,68,68,0.25)",
//             color: message.type === "success" ? "#6EBD8A" : "#F87171",
//             fontSize: "0.88rem",
//             display: "flex",
//             alignItems: "center",
//             gap: 8,
//           }}
//         >
//           {message.text}
//         </div>
//       )}

//       {/* Virtual Account Section */}
//       {virtualAccounts.length > 0 ? (
//         <Card>
//           <h2
//             style={{
//               fontWeight: 600,
//               color: "var(--text)",
//               fontSize: "1rem",
//               marginBottom: "0.75rem",
//               display: "flex",
//               alignItems: "center",
//               gap: 8,
//             }}
//           >
//             💳 Your Virtual Account
//           </h2>
//           <p
//             style={{
//               fontSize: "0.8rem",
//               color: "var(--dim)",
//               marginBottom: "1rem",
//             }}
//           >
//             Transfer money to this account and it will automatically fund your
//             wallet.
//           </p>
//           {virtualAccounts.map((account: any, i: number) => (
//             <div
//               key={account.id}
//               style={{
//                 background: "var(--bg2)",
//                 borderRadius: 10,
//                 padding: "1rem",
//                 marginBottom: i < virtualAccounts.length - 1 ? "0.5rem" : 0,
//                 border: "1px solid var(--border)",
//               }}
//             >
//               <p
//                 style={{
//                   fontWeight: 600,
//                   color: "var(--text)",
//                   marginBottom: 4,
//                 }}
//               >
//                 {account.bank_name}
//               </p>
//               <div
//                 style={{
//                   display: "flex",
//                   alignItems: "center",
//                   gap: 8,
//                   marginBottom: 2,
//                 }}
//               >
//                 <p
//                   style={{
//                     fontSize: "1.1rem",
//                     fontWeight: 700,
//                     fontFamily: "monospace",
//                     color: "var(--accent-lt)",
//                   }}
//                 >
//                   {account.account_number}
//                 </p>
//                 <button
//                   onClick={() => copyToClipboard(account.account_number)}
//                   style={{
//                     background: "none",
//                     border: "none",
//                     color: "var(--dim)",
//                     cursor: "pointer",
//                     padding: 2,
//                   }}
//                   title="Copy account number"
//                 >
//                   <Copy size={14} />
//                 </button>
//               </div>
//               <p style={{ fontSize: "0.85rem", color: "var(--dim)" }}>
//                 {account.account_name}
//               </p>
//             </div>
//           ))}
//         </Card>
//       ) : (
//         <Card>
//           <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
//             {/* // Replace the form with this simplified UI: */}

//             {!showVirtualForm ? (
//               <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
//                 <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
//                   Get Your Virtual Account
//                 </p>
//                 <p
//                   style={{
//                     fontSize: "0.85rem",
//                     color: "var(--muted)",
//                     marginBottom: "1rem",
//                   }}
//                 >
//                   One-click setup. <em> Fund your wallet instantly</em>.
//                 </p>
//                 <button
//                   onClick={handleCreateVirtualAccount}
//                   disabled={virtualLoading}
//                   style={{
//                     padding: "0.6rem 1.5rem",
//                     background: "var(--accent)",
//                     border: "none",
//                     borderRadius: 10,
//                     color: "#FDF8F3",
//                     fontWeight: 600,
//                     fontSize: "0.9rem",
//                     cursor: "pointer",
//                     fontFamily: "inherit",
//                     opacity: virtualLoading ? 0.7 : 1,
//                   }}
//                 >
//                   {virtualLoading ? "Creating..." : "Create Virtual Account →"}
//                 </button>
//               </div>
//             ) : null}
//           </div>
//         </Card>
//       )}

//       {/* Balance Card */}
//       <Card
//         style={{
//           background: "linear-gradient(135deg, var(--card), var(--bg2))",
//           border: "1px solid var(--border2)",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "space-between",
//             flexWrap: "wrap",
//             gap: "1rem",
//           }}
//         >
//           <div>
//             <p
//               style={{
//                 fontSize: "0.8rem",
//                 color: "var(--dim)",
//                 marginBottom: 4,
//               }}
//             >
//               Withdrawable Balance
//             </p>
//             <p
//               style={{
//                 fontFamily: "'Playfair Display', serif",
//                 fontSize: "2.5rem",
//                 fontWeight: 700,
//                 color: "var(--text)",
//               }}
//             >
//               {formatNaira(currentBalance)} +{" "}
//               {formatNaira(wallet?.total_profit || 0)}
//             </p>
//           </div>
//           <button
//             onClick={() => {
//               setShowWithdraw(!showWithdraw);
//               setAmount("");
//               setMessage(null);
//             }}
//             disabled={currentBalance <= 0}
//             style={{
//               display: "inline-flex",
//               alignItems: "center",
//               gap: 6,
//               padding: "0.7rem 1.5rem",
//               background: showWithdraw ? "var(--accent)" : "var(--bg2)",
//               color: showWithdraw ? "#FDF8F3" : "var(--text)",
//               border: showWithdraw ? "none" : "1px solid var(--border)",
//               borderRadius: 10,
//               fontSize: "0.85rem",
//               fontWeight: 600,
//               cursor: currentBalance <= 0 ? "not-allowed" : "pointer",
//               fontFamily: "inherit",
//               opacity: currentBalance <= 0 ? 0.5 : 1,
//             }}
//           >
//             <ArrowUpRight size={16} />
//             Withdraw
//           </button>
//         </div>

//         {/* Withdraw form */}
//         {showWithdraw && (
//           <div
//             style={{
//               marginTop: "1.5rem",
//               padding: "1.25rem",
//               background: "var(--bg2)",
//               borderRadius: 10,
//               border: "1px solid var(--border)",
//             }}
//           >
//             {withdrawStep === "amount" ? (
//               <>
//                 <label style={labelStyle}>Withdrawal Amount</label>
//                 <div
//                   style={{
//                     display: "flex",
//                     gap: "0.75rem",
//                     alignItems: "flex-end",
//                     flexWrap: "wrap",
//                   }}
//                 >
//                   <div style={{ flex: 1, minWidth: 150 }}>
//                     <input
//                       type="number"
//                       value={amount}
//                       onChange={(e) => setAmount(e.target.value)}
//                       placeholder="Enter amount"
//                       style={{
//                         width: "100%",
//                         padding: "0.7rem 1rem",
//                         background: "var(--bg)",
//                         border: "1px solid var(--border)",
//                         borderRadius: 10,
//                         color: "var(--text)",
//                         fontSize: "1rem",
//                         outline: "none",
//                         fontFamily: "inherit",
//                       }}
//                       min="100"
//                     />
//                   </div>
//                   <button
//                     onClick={() => setWithdrawStep("bank")}
//                     disabled={!amount || Number(amount) <= 0}
//                     style={{
//                       padding: "0.7rem 1.5rem",
//                       background: "var(--accent)",
//                       border: "none",
//                       borderRadius: 10,
//                       color: "#fff",
//                       fontWeight: 600,
//                       fontSize: "0.9rem",
//                       cursor: "pointer",
//                       fontFamily: "inherit",
//                       opacity: !amount || Number(amount) <= 0 ? 0.5 : 1,
//                     }}
//                   >
//                     Continue
//                   </button>
//                 </div>
//                 {amount && Number(amount) > 0 && (
//                   <div
//                     style={{
//                       marginTop: "0.75rem",
//                       padding: "0.7rem 1rem",
//                       background: "rgba(201,138,84,0.08)",
//                       borderRadius: 8,
//                       fontSize: "0.82rem",
//                       color: "var(--accent-lt)",
//                     }}
//                   >
//                     <p>
//                       2% processing fee: <strong>{formatNaira(fee)}</strong>
//                     </p>
//                     <p>
//                       You'll receive: <strong>{formatNaira(netAmount)}</strong>
//                     </p>
//                   </div>
//                 )}
//               </>
//             ) : (
//               <>
//                 <div style={{ marginBottom: "1rem" }}>
//                   <label style={labelStyle}>Bank</label>
//                   <select
//                     value={selectedBank}
//                     onChange={(e) => {
//                       setSelectedBank(e.target.value);
//                       setAccountNumber("");
//                       setAccountName("");
//                     }}
//                     style={{
//                       ...inputStyle,
//                       appearance: "auto",
//                     }}
//                   >
//                     <option value="">Select bank</option>
//                     {banks.map((bank) => (
//                       <option key={bank.bankCode} value={bank.bankCode}>
//                         {bank.bankName}
//                       </option>
//                     ))}
//                   </select>
//                 </div>

//                 <div style={{ marginBottom: "1rem" }}>
//                   <label style={labelStyle}>Account Number</label>
//                   <div style={{ position: "relative" }}>
//                     <input
//                       type="text"
//                       value={accountNumber}
//                       onChange={(e) => {
//                         setAccountNumber(
//                           e.target.value.replace(/\D/g, "").slice(0, 10),
//                         );
//                       }}
//                       placeholder="0123456789"
//                       maxLength={10}
//                       style={{
//                         ...inputStyle,
//                         paddingRight: verifying ? "2.5rem" : "0.8rem",
//                       }}
//                     />
//                     {verifying && (
//                       <div
//                         style={{
//                           position: "absolute",
//                           right: 12,
//                           top: "50%",
//                           transform: "translateY(-50%)",
//                         }}
//                       >
//                         <Loader2
//                           size={16}
//                           style={{
//                             color: "var(--accent)",
//                             animation: "spin 1s linear infinite",
//                           }}
//                         />
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Verification result */}
//                 {accountName && (
//                   <div
//                     style={{
//                       padding: "0.6rem 0.8rem",
//                       background: "rgba(110,189,138,0.1)",
//                       border: "1px solid rgba(110,189,138,0.3)",
//                       borderRadius: 8,
//                       marginBottom: "1rem",
//                       fontSize: "0.85rem",
//                       color: "#6EBD8A",
//                       display: "flex",
//                       alignItems: "center",
//                       gap: 6,
//                     }}
//                   >
//                     <Check size={16} />
//                     {accountName}
//                   </div>
//                 )}

//                 {/* No match found state */}
//                 {!verifying &&
//                   !accountName &&
//                   accountNumber.length === 10 &&
//                   selectedBank && (
//                     <div
//                       style={{
//                         padding: "0.6rem 0.8rem",
//                         background: "rgba(239,68,68,0.08)",
//                         border: "1px solid rgba(239,68,68,0.2)",
//                         borderRadius: 8,
//                         marginBottom: "1rem",
//                         fontSize: "0.82rem",
//                         color: "#F87171",
//                       }}
//                     >
//                       Could not verify account. Please check the details.
//                     </div>
//                   )}

//                 <div
//                   style={{
//                     marginTop: "0.75rem",
//                     padding: "0.7rem 1rem",
//                     background: "rgba(201,138,84,0.08)",
//                     borderRadius: 8,
//                     fontSize: "0.82rem",
//                     color: "var(--accent-lt)",
//                     marginBottom: "1rem",
//                   }}
//                 >
//                   <p>
//                     Amount: <strong>{formatNaira(Number(amount))}</strong>
//                   </p>
//                   <p>
//                     Fee (2%): <strong>{formatNaira(fee)}</strong>
//                   </p>
//                   <p>
//                     You'll receive: <strong>{formatNaira(netAmount)}</strong>
//                   </p>
//                 </div>

//                 <div style={{ display: "flex", gap: "0.5rem" }}>
//                   <button
//                     onClick={handleWithdraw}
//                     disabled={loading || !accountName}
//                     style={{
//                       flex: 1,
//                       padding: "0.7rem",
//                       background: "var(--accent)",
//                       border: "none",
//                       borderRadius: 10,
//                       color: "#fff",
//                       fontWeight: 600,
//                       fontSize: "0.9rem",
//                       cursor: "pointer",
//                       fontFamily: "inherit",
//                       display: "inline-flex",
//                       alignItems: "center",
//                       justifyContent: "center",
//                       gap: 6,
//                       opacity: loading || !accountName ? 0.7 : 1,
//                     }}
//                   >
//                     {loading && (
//                       <Loader2
//                         size={16}
//                         style={{ animation: "spin 1s linear infinite" }}
//                       />
//                     )}
//                     Confirm Withdrawal
//                   </button>
//                   <button
//                     onClick={() => setWithdrawStep("amount")}
//                     style={{
//                       padding: "0.7rem 1rem",
//                       background: "var(--bg2)",
//                       border: "1px solid var(--border)",
//                       borderRadius: 10,
//                       color: "var(--muted)",
//                       fontSize: "0.9rem",
//                       cursor: "pointer",
//                       fontFamily: "inherit",
//                     }}
//                   >
//                     Back
//                   </button>
//                 </div>
//               </>
//             )}
//           </div>
//         )}

//         {/* Stats row */}
//         <div
//           style={{
//             display: "grid",
//             gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
//             gap: "1rem",
//             marginTop: "1.5rem",
//             paddingTop: "1.25rem",
//             borderTop: "1px solid var(--border)",
//           }}
//         >
//           <div>
//             <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
//               Total Sales
//             </p>
//             <p
//               style={{
//                 fontSize: "1rem",
//                 fontWeight: 600,
//                 color: "var(--text)",
//               }}
//             >
//               {/* {formatNaira(wallet?.total_sales || 0)} */}
//               {formatNaira(currentBalance)}
//             </p>
//           </div>
//           <div>
//             <p style={{ fontSize: "0.75rem", color: "var(--dim)" }}>
//               Total Profit
//             </p>
//             <p
//               style={{
//                 fontSize: "1rem",
//                 fontWeight: 600,
//                 color: "var(--green)",
//               }}
//             >
//               {formatNaira(wallet?.total_profit || 0)}
//             </p>
//           </div>
//         </div>
//       </Card>

//       {/* Transaction History */}
//       <Card padding="none">
//         <div
//           style={{
//             padding: "1.25rem 1.5rem",
//             borderBottom: "1px solid var(--border)",
//           }}
//         >
//           <h2
//             style={{ fontWeight: 600, color: "var(--text)", fontSize: "1rem" }}
//           >
//             Transaction History
//           </h2>
//         </div>
//         {transactions.length === 0 ? (
//           <div
//             style={{
//               padding: "2rem",
//               textAlign: "center",
//               color: "var(--dim)",
//             }}
//           >
//             <WalletIcon
//               size={32}
//               style={{ margin: "0 auto 0.5rem", opacity: 0.3 }}
//             />
//             <p>No transactions yet</p>
//           </div>
//         ) : (
//           <div style={{ overflowX: "auto" }}>
//             <table style={{ width: "100%", borderCollapse: "collapse" }}>
//               <thead>
//                 <tr
//                   style={{
//                     borderBottom: "1px solid var(--border)",
//                     textAlign: "left",
//                   }}
//                 >
//                   <th style={thStyle}>Type</th>
//                   <th style={thStyle}>Amount</th>
//                   <th style={thStyle}>Status</th>
//                   <th style={thStyle}>Date</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {transactions.map((tx) => (
//                   <tr
//                     key={tx.id}
//                     style={{ borderBottom: "1px solid var(--border)" }}
//                   >
//                     <td style={tdStyle}>
//                       <span
//                         style={{
//                           display: "inline-flex",
//                           alignItems: "center",
//                           gap: 6,
//                           padding: "0.2rem 0.6rem",
//                           borderRadius: 100,
//                           fontSize: "0.75rem",
//                           fontWeight: 600,
//                           textTransform: "capitalize",
//                           background:
//                             tx.type === "deposit"
//                               ? "rgba(110,189,138,0.12)"
//                               : tx.type === "withdrawal"
//                                 ? "rgba(239,68,68,0.12)"
//                                 : "rgba(201,138,84,0.12)",
//                           color:
//                             tx.type === "deposit"
//                               ? "#6EBD8A"
//                               : tx.type === "withdrawal"
//                                 ? "#F87171"
//                                 : "var(--accent-lt)",
//                         }}
//                       >
//                         {tx.type === "deposit" && <ArrowDownRight size={12} />}
//                         {tx.type === "withdrawal" && <ArrowUpRight size={12} />}
//                         {tx.type}
//                       </span>
//                     </td>
//                     <td style={{ ...tdStyle, fontWeight: 600 }}>
//                       {tx.type === "deposit"
//                         ? `+${formatNaira(tx.amount)}`
//                         : `-${formatNaira(tx.amount)}`}
//                     </td>
//                     <td style={tdStyle}>
//                       <Badge
//                         variant={
//                           tx.status === "completed"
//                             ? "success"
//                             : tx.status === "pending"
//                               ? "warning"
//                               : "error"
//                         }
//                       >
//                         {tx.status}
//                       </Badge>
//                     </td>
//                     <td
//                       style={{
//                         ...tdStyle,
//                         color: "var(--dim)",
//                         fontSize: "0.8rem",
//                       }}
//                     >
//                       {new Date(tx.created_at).toLocaleDateString("en-NG", {
//                         month: "short",
//                         day: "numeric",
//                         hour: "2-digit",
//                         minute: "2-digit",
//                       })}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </Card>
//     </div>
//   );
// }

// const labelStyle: React.CSSProperties = {
//   display: "block",
//   fontSize: "0.8rem",
//   fontWeight: 600,
//   color: "var(--muted)",
//   marginBottom: 4,
// };

// const inputStyle: React.CSSProperties = {
//   width: "100%",
//   padding: "0.6rem 0.8rem",
//   background: "var(--bg)",
//   border: "1px solid var(--border)",
//   borderRadius: 8,
//   color: "var(--text)",
//   fontSize: "0.88rem",
//   outline: "none",
//   fontFamily: "inherit",
//   boxSizing: "border-box",
// };

// const thStyle: React.CSSProperties = {
//   padding: "0.75rem 1rem",
//   fontSize: "0.8rem",
//   fontWeight: 600,
//   color: "var(--dim)",
//   textTransform: "uppercase",
//   letterSpacing: "0.05em",
// };

// const tdStyle: React.CSSProperties = {
//   padding: "0.75rem 1rem",
//   fontSize: "0.88rem",
//   color: "var(--text)",
// };
