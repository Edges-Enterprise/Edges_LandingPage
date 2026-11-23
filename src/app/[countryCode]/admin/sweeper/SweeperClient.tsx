"use client";

// src/app/[countryCode]/admin/sweeper/SweeperClient.tsx
//
// Platform-admin sweeper UI: what is sitting in the Xixapay account, and the
// form that pays it out to a bank.
//
// Xixapay has no balance API, so the figure here comes from the
// `xixapay_wallet_balance` view over the payment webhook's ledger. It is
// therefore a ledger-derived balance, not a provider-quoted one: it is correct
// as long as every payment and sweep reached the ledger, and it will drift if
// one did not. The page says so, because an admin moving real money deserves to
// know which number they are trusting.
//
// The account name is resolved by the provider BEFORE the send, and shown with
// a confirmation step, so a typo cannot pay a stranger.

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import ThemeSelect from "@/app/[countryCode]/dashboard/ThemeSelect";
import { useIsMobile } from "@/hooks/common/useIsMobile";
import {
  getSweeperState,
  listSweepBanks,
  requestSweep,
  resolveSweepBank,
  type SweeperState,
} from "@/app/actions/xixapay-sweeper";

interface Bank {
  bankName: string;
  bankCode: string;
}

interface Props {
  countryCode: string;
  adminEmail: string | null;
  initialState: SweeperState;
}

const naira = (value: number) =>
  `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const card: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--dim)",
  marginBottom: "0.4rem",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "0.5rem",
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
  fontSize: "0.9rem",
};

const primaryButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.4rem",
  padding: "0.65rem 1.1rem",
  borderRadius: "0.5rem",
  background: "var(--accent)",
  color: "var(--bg)",
  border: "none",
  fontWeight: 700,
  fontSize: "0.875rem",
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  ...primaryButton,
  background: "transparent",
  color: "var(--muted)",
  border: "1px solid var(--border)",
};

export default function SweeperClient({
  countryCode,
  adminEmail,
  initialState,
}: Props) {
  const [state, setState] = useState<SweeperState>(initialState);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<
    { kind: "ok" | "error"; text: string } | null
  >(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const isMobile = useIsMobile();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      const next = await getSweeperState();
      if (next.success) setState(next);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await listSweepBanks();
      if (cancelled) return;
      if (result.success) {
        setBanks(
          [...result.banks].sort((a, b) => a.bankName.localeCompare(b.bankName)),
        );
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const numericAmount = Number(amount);
  const amountValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= state.minSweep &&
    numericAmount <= state.balance;

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // Guards against a slow reply for an old account number overwriting the name
  // of the one now in the field.
  const verifySeq = useRef(0);

  const canSubmit =
    amountValid && accountName !== "" && bankCode !== "" && !pending;

  // Resolve the account name as soon as both inputs are complete, so the admin
  // never has to press Verify. Debounced because the number is typed digit by
  // digit and each resolve is a provider call.
  useEffect(() => {
    const ready = bankCode !== "" && /^\d{6,}$/.test(accountNumber);
    if (!ready) {
      setAccountName("");
      setVerifyError(null);
      setVerifying(false);
      return;
    }

    const seq = ++verifySeq.current;
    setVerifying(true);
    setVerifyError(null);

    const timer = setTimeout(async () => {
      const result = await resolveSweepBank(bankCode, accountNumber);
      if (seq !== verifySeq.current) return;
      setVerifying(false);
      if (result.success) {
        setAccountName(result.accountName);
      } else {
        setAccountName("");
        setVerifyError(result.error);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [bankCode, accountNumber]);

  const handleSubmit = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await requestSweep({
        bankCode,
        accountNumber,
        accountName,
        amount: numericAmount,
        countryCode,
      });
      setConfirming(false);
      if (result.success) {
        setMessage({
          kind: "ok",
          text: `Sent ${naira(result.amount)} to ${accountName}. Reference ${result.reference}.`,
        });
        setAmount("");
        const next = await getSweeperState();
        if (next.success) setState(next);
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  };

  const selectedBankName = useMemo(
    () => banks.find((b) => b.bankCode === bankCode)?.bankName ?? "",
    [banks, bankCode],
  );

  const bankOptions = useMemo(
    () =>
      banks.map((bank) => ({
        value: bank.bankCode,
        label: bank.bankName,
        text: bank.bankName,
      })),
    [banks],
  );

  return (
    <div
      style={{
        maxWidth: "60rem",
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        display: "grid",
        gap: "1.25rem",
      }}
    >
      <header>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text)",
            margin: 0,
          }}
        >
          Xixapay sweeper
        </h1>
        <p
          style={{
            color: "var(--muted)",
            marginTop: "0.35rem",
            fontSize: "0.875rem",
          }}
        >
          Move the platform&apos;s Xixapay float to a bank account.
          {adminEmail ? ` Signed in as ${adminEmail}.` : ""}
        </p>
      </header>

      <section style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={label}>Available to sweep</div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--accent)",
                lineHeight: 1.1,
              }}
            >
              {naira(state.balance)}
            </div>
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                color: "var(--dim)",
              }}
            >
              Deposits {naira(state.ledgerDeposits)} − sweeps{" "}
              {naira(state.ledgerSweeps)}
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={pending}
            style={ghostButton}
          >
            {pending ? (
              <Loader2 size={15} className="anim-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            Refresh
          </button>
        </div>

        <p
          style={{
            marginTop: "1rem",
            paddingTop: "0.85rem",
            borderTop: "1px solid var(--border)",
            fontSize: "0.78rem",
            color: "var(--dim)",
            lineHeight: 1.5,
          }}
        >
          Xixapay has no balance API, so this figure is derived from our payment
          ledger — not quoted by the provider. Confirm against the Xixapay
          dashboard before a large sweep.
        </p>
      </section>

      <section style={card}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text)",
            margin: 0,
            marginBottom: "1rem",
          }}
        >
          Pay out to bank
        </h2>

        <div style={{ display: "grid", gap: "0.9rem" }}>
          <div>
            <label style={label} htmlFor="sweep-bank">
              Bank
            </label>
            <ThemeSelect
              id="sweep-bank"
              ariaLabel="Bank"
              value={bankCode}
              placeholder="Select a bank"
              searchable
              searchPlaceholder="Search banks…"
              menuMinWidth={260}
              style={{ width: "100%" }}
              options={bankOptions}
              onChange={(next) => {
                setBankCode(next);
                setAccountName("");
                setVerifyError(null);
                setConfirming(false);
              }}
            />
          </div>

          <div>
            <label style={label} htmlFor="sweep-account">
              Account number
            </label>
            <input
              id="sweep-account"
              style={input}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0123456789"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value.replace(/\D/g, ""));
                setAccountName("");
                setVerifyError(null);
                setConfirming(false);
              }}
            />
          </div>

          {verifying ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.85rem",
                color: "var(--dim)",
              }}
            >
              <Loader2 size={15} className="anim-spin" /> Verifying account…
            </div>
          ) : accountName ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.85rem",
                color: "var(--green)",
                fontWeight: 600,
              }}
            >
              <Check size={15} /> {accountName}
            </div>
          ) : verifyError ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.4rem",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                color: "#e8896b",
              }}
            >
              <AlertTriangle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{verifyError}</span>
            </div>
          ) : null}

          <div>
            <label style={label} htmlFor="sweep-amount">
              Amount
            </label>
            <input
              id="sweep-amount"
              style={input}
              inputMode="decimal"
              placeholder={String(state.minSweep)}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value.replace(/[^\d.]/g, ""));
                setConfirming(false);
              }}
            />
            <div
              style={{
                marginTop: "0.35rem",
                fontSize: "0.75rem",
                color: "var(--dim)",
              }}
            >
              Minimum {naira(state.minSweep)} · available {naira(state.balance)}
            </div>
          </div>

          {message ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.45rem",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                color: message.kind === "ok" ? "var(--green)" : "#e8896b",
              }}
            >
              {message.kind === "error" ? (
                <AlertTriangle size={15} style={{ marginTop: 2, flexShrink: 0 }} />
              ) : (
                <Check size={15} style={{ marginTop: 2, flexShrink: 0 }} />
              )}
              <span>{message.text}</span>
            </div>
          ) : null}

          {confirming ? (
            <div
              style={{
                border: "1px solid var(--border2)",
                borderRadius: "0.5rem",
                padding: "0.85rem",
                background: "var(--bg2)",
                fontSize: "0.85rem",
                color: "var(--text)",
                lineHeight: 1.6,
              }}
            >
              Send <strong>{naira(numericAmount)}</strong> to{" "}
              <strong>{accountName}</strong>
              {selectedBankName ? ` (${selectedBankName})` : ""}? This cannot be
              undone.
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                ...primaryButton,
                opacity: canSubmit ? 1 : 0.5,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {pending ? <Loader2 size={15} className="anim-spin" /> : null}
              {confirming ? "Confirm payout" : "Sweep to bank"}
            </button>
            {confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={ghostButton}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section style={card}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "var(--text)",
            margin: 0,
            marginBottom: "0.85rem",
          }}
        >
          Recent sweeps
        </h2>

        {state.history.length === 0 ? (
          <p style={{ color: "var(--dim)", fontSize: "0.85rem", margin: 0 }}>
            No sweeps yet.
          </p>
        ) : isMobile ? (
          /* Phone layout: the row shows amount and status, and the timestamp —
             the widest column — moves behind a disclosure. */
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {state.history.map((row) => {
              const isOpen = expandedId === row.id;
              const toggle = () => setExpandedId(isOpen ? null : row.id);
              return (
                <div
                  key={row.id}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={toggle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle();
                    }
                  }}
                  style={{
                    background: "var(--bg2)",
                    borderRadius: 8,
                    padding: "0.75rem 0.9rem",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {row.sweep_amount === null
                          ? "No amount"
                          : naira(Number(row.sweep_amount))}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          marginTop: "0.15rem",
                          color:
                            row.status === "completed"
                              ? "var(--green)"
                              : "#e8896b",
                        }}
                      >
                        {row.status}
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      style={{
                        color: "var(--dim)",
                        flexShrink: 0,
                        transform: isOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  </div>

                  {isOpen ? (
                    <div
                      style={{
                        marginTop: "0.65rem",
                        paddingTop: "0.65rem",
                        borderTop: "1px solid var(--border)",
                        display: "grid",
                        gap: "0.35rem",
                        fontSize: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "1rem",
                        }}
                      >
                        <span style={{ color: "var(--dim)" }}>When</span>
                        <span style={{ color: "var(--text)" }}>
                          {new Date(row.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "1rem",
                        }}
                      >
                        <span style={{ color: "var(--dim)" }}>Target</span>
                        <span
                          style={{
                            color: "var(--text)",
                            textAlign: "end",
                            wordBreak: "break-word",
                          }}
                        >
                          {row.target_bank || "—"}
                          {row.target_account ? ` · ${row.target_account}` : ""}
                        </span>
                      </div>
                      {row.reference ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "1rem",
                          }}
                        >
                          <span style={{ color: "var(--dim)" }}>Reference</span>
                          <span
                            style={{
                              color: "var(--text)",
                              textAlign: "end",
                              wordBreak: "break-all",
                            }}
                          >
                            {row.reference}
                          </span>
                        </div>
                      ) : null}
                      {row.error ? (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "1rem",
                          }}
                        >
                          <span style={{ color: "var(--dim)" }}>Error</span>
                          <span
                            style={{
                              color: "#e8896b",
                              textAlign: "end",
                              wordBreak: "break-word",
                            }}
                          >
                            {row.error}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.8rem",
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "var(--dim)" }}>
                  <th style={{ padding: "0.4rem 0.5rem 0.4rem 0" }}>When</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Amount</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Target</th>
                  <th style={{ padding: "0.4rem 0.5rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {state.history.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    <td
                      style={{
                        padding: "0.5rem 0.5rem 0.5rem 0",
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "0.5rem",
                        color: "var(--text)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.sweep_amount === null
                        ? "—"
                        : naira(Number(row.sweep_amount))}
                    </td>
                    <td style={{ padding: "0.5rem", color: "var(--muted)" }}>
                      {row.target_bank || "—"}
                      {row.target_account ? (
                        <span style={{ color: "var(--dim)" }}>
                          {" "}
                          · {row.target_account}
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: "0.5rem" }}>
                      <span
                        style={{
                          color:
                            row.status === "completed"
                              ? "var(--green)"
                              : "#e8896b",
                          fontWeight: 600,
                        }}
                      >
                        {row.status}
                      </span>
                      {row.error ? (
                        <div
                          style={{
                            color: "var(--dim)",
                            fontSize: "0.72rem",
                            marginTop: "0.2rem",
                            maxWidth: "22rem",
                          }}
                        >
                          {row.error}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
