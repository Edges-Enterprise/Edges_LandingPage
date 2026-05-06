// app/(reseller-dashboard)/wallet/WalletClient.tsx

"use client";

import { useState } from "react";
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
} from "lucide-react";
import { withdrawFunds } from "@/app/actions/reseller/wallet/withdrawFunds";
import { fundWallet } from "@/app/actions/reseller/wallet/fundWallet";

export function WalletClient({
  resellerId,
  wallet,
  transactions,
}: {
  resellerId: string;
  wallet: ResellerWallet | null;
  transactions: Transaction[];
}) {
  const [activeAction, setActiveAction] = useState<
    "deposit" | "withdraw" | null
  >(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [currentBalance, setCurrentBalance] = useState(wallet?.balance || 0);

  const fee = amount ? calculateWithdrawalFee(Number(amount)) : 0;
  const netAmount = amount ? Number(amount) - fee : 0;

  const handleDeposit = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setMessage(null);

    const result = await fundWallet({
      resellerId,
      amount: Number(amount),
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setCurrentBalance((prev) => prev + Number(amount));
      setAmount("");
      setActiveAction(null);
      setMessage({
        type: "success",
        text: `Successfully deposited ${formatNaira(Number(amount))}`,
      });
    }

    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setMessage(null);

    const result = await withdrawFunds({
      resellerId,
      amount: Number(amount),
    });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setCurrentBalance((prev) => prev - Number(amount) - (result.fee || 0));
      setAmount("");
      setActiveAction(null);
      setMessage({
        type: "success",
        text: `Withdrawal of ${formatNaira(Number(amount))} initiated. Fee: ${formatNaira(result.fee || 0)}`,
      });
    }

    setLoading(false);
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
          Manage your funds and withdrawals
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
          }}
        >
          {message.text}
        </div>
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
              Available Balance
            </p>
            <p
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "2.5rem",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              {formatNaira(currentBalance)}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => {
                setActiveAction(activeAction === "deposit" ? null : "deposit");
                setAmount("");
                setMessage(null);
              }}
              style={{
                ...actionBtnStyle,
                background:
                  activeAction === "deposit" ? "var(--green)" : "var(--bg2)",
                color: activeAction === "deposit" ? "#fff" : "var(--text)",
                border:
                  activeAction === "deposit"
                    ? "none"
                    : "1px solid var(--border)",
              }}
            >
              <ArrowDownRight size={16} />
              Deposit
            </button>
            <button
              onClick={() => {
                setActiveAction(
                  activeAction === "withdraw" ? null : "withdraw",
                );
                setAmount("");
                setMessage(null);
              }}
              disabled={currentBalance <= 0}
              style={{
                ...actionBtnStyle,
                background:
                  activeAction === "withdraw" ? "var(--accent)" : "var(--bg2)",
                color: activeAction === "withdraw" ? "#FDF8F3" : "var(--text)",
                border:
                  activeAction === "withdraw"
                    ? "none"
                    : "1px solid var(--border)",
                opacity: currentBalance <= 0 ? 0.5 : 1,
              }}
            >
              <ArrowUpRight size={16} />
              Withdraw
            </button>
          </div>
        </div>

        {/* Action form */}
        {activeAction && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              background: "var(--bg2)",
              borderRadius: 10,
              border: "1px solid var(--border)",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "0.5rem",
              }}
            >
              {activeAction === "deposit"
                ? "Deposit Amount"
                : "Withdrawal Amount"}
            </label>
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
                  placeholder="Enter amount"
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
                  min="100"
                />
              </div>
              <button
                onClick={
                  activeAction === "deposit" ? handleDeposit : handleWithdraw
                }
                disabled={loading || !amount || Number(amount) <= 0}
                style={{
                  padding: "0.7rem 1.5rem",
                  background:
                    activeAction === "deposit"
                      ? "var(--green)"
                      : "var(--accent)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading && (
                  <Loader2
                    size={16}
                    style={{ animation: "spin 1s linear infinite" }}
                  />
                )}
                {activeAction === "deposit" ? "Fund Wallet" : "Withdraw"}
              </button>
            </div>

            {activeAction === "withdraw" && amount && Number(amount) > 0 && (
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
                  2% gateway fee: <strong>{formatNaira(fee)}</strong>
                </p>
                <p>
                  You'll receive: <strong>{formatNaira(netAmount)}</strong>
                </p>
              </div>
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
              Total Sales
            </p>
            <p
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--text)",
              }}
            >
              {formatNaira(wallet?.total_sales || 0)}
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

const actionBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "0.6rem 1.2rem",
  borderRadius: 10,
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.15s",
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
