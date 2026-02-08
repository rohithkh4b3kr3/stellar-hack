import { useState, useEffect } from "react";
import {
  isNativeXlm,
  canSubmitNativeXlmEscrow,
  getMaxSpendable,
  XLM_MIN_ESCROW_STROOPS,
  stroopsToXlm,
} from "./token";

export function useNativeXlmGuard(
  tokenId: string,
  amount: string,
  wallet: string,
  enabled: boolean
): {
  canSubmit: boolean;
  spendable: string;
  spendableLoaded: boolean;
  errorMessage: string | null;
} {
  const [spendable, setSpendable] = useState("");
  const [spendableLoaded, setSpendableLoaded] = useState(false);

  useEffect(() => {
    if (!enabled || !tokenId || !wallet || !isNativeXlm(tokenId)) {
      setSpendable("");
      setSpendableLoaded(!enabled);
      return;
    }
    setSpendableLoaded(false);
    getMaxSpendable(tokenId, wallet)
      .then((s) => {
        setSpendable(s);
        setSpendableLoaded(true);
      })
      .catch(() => {
        setSpendable("0");
        setSpendableLoaded(true);
      });
  }, [enabled, tokenId, wallet]);

  const isNative = isNativeXlm(tokenId);
  const amountOk = BigInt(amount || "0") >= BigInt(XLM_MIN_ESCROW_STROOPS);
  const canSubmit =
    !isNative ||
    (spendableLoaded &&
      (spendable !== "" || !enabled) &&
      canSubmitNativeXlmEscrow(spendable, amount));

  let errorMessage: string | null = null;
  if (isNative && enabled) {
    if (!spendableLoaded || spendable === "") {
      errorMessage = null;
    } else if (!amountOk) {
      errorMessage = "Native XLM escrow requires at least 2 XLM.";
    } else if (!canSubmitNativeXlmEscrow(spendable, amount)) {
      errorMessage = `Not enough spendable XLM. You have ${stroopsToXlm(spendable)} XLM available (balance minus 1 XLM reserve).`;
    }
  }

  return {
    canSubmit: !isNative || canSubmit,
    spendable,
    spendableLoaded: !isNative || spendableLoaded,
    errorMessage,
  };
}
