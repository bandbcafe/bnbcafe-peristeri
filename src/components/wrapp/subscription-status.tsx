"use client";

import React, { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaSpinner,
  FaUser,
  FaEnvelope,
  FaIdCard,
} from "react-icons/fa";
import { getFormattedSubscriptionInfo } from "@/lib/wrapp";

interface SubscriptionStatusProps {
  baseUrl?: string;
  className?: string;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  baseUrl = "https://staging.wrapp.ai/api/v1",
  className = "",
}) => {
  const [loading, setLoading] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const loadSubscriptionInfo = async () => {
    setLoading(true);
    setError("");

    try {
      const info = await getFormattedSubscriptionInfo(baseUrl);
      setSubscriptionInfo(info);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Σφάλμα φόρτωσης στοιχείων συνδρομής"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptionInfo();
  }, [baseUrl]);

  const getStatusIcon = () => {
    if (loading) return <FaSpinner className="animate-spin text-blue-500" />;
    if (!subscriptionInfo) return <FaTimesCircle className="text-red-500" />;

    switch (subscriptionInfo.status) {
      case "active":
        return <FaCheckCircle className="text-green-500" />;
      case "limited":
        return <FaExclamationTriangle className="text-yellow-500" />;
      case "inactive":
        return <FaTimesCircle className="text-red-500" />;
      default:
        return <FaTimesCircle className="text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (!subscriptionInfo) return "border-red-200 bg-red-50";

    switch (subscriptionInfo.status) {
      case "active":
        return "border-green-200 bg-green-50";
      case "limited":
        return "border-yellow-200 bg-yellow-50";
      case "inactive":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getStatusColor()} ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        {getStatusIcon()}
        <h3 className="text-lg font-semibold text-gray-800">
          Κατάσταση Συνδρομής WRAPP
        </h3>
        <button
          onClick={loadSubscriptionInfo}
          disabled={loading}
          className="ml-auto px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Φόρτωση..." : "Ανανέωση"}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-100 border border-red-300 rounded text-red-700">
          <strong>Σφάλμα:</strong> {error}
        </div>
      )}

      {subscriptionInfo && (
        <>
          <div className="mb-4 p-3 bg-white rounded border">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {subscriptionInfo.message}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <FaEnvelope className="text-gray-500" />
                <span className="font-medium">Email:</span>
                <span className="text-gray-700">
                  {subscriptionInfo.details.email || "Μη διαθέσιμο"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <FaIdCard className="text-gray-500" />
                <span className="font-medium">User ID:</span>
                <span className="text-gray-700 font-mono text-xs">
                  {subscriptionInfo.details.userId || "Μη διαθέσιμο"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Ενεργή Συνδρομή:</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    subscriptionInfo.details.hasActivePlan
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {subscriptionInfo.details.hasActivePlan ? "Ναι" : "Όχι"}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Έκδοση Παραστατικών:</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    subscriptionInfo.details.canIssueInvoices
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {subscriptionInfo.details.canIssueInvoices
                    ? "Ενεργή"
                    : "Ανενεργή"}
                </span>
              </div>
            </div>
          </div>

          {subscriptionInfo.status !== "active" && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>💡 Συμβουλή:</strong> Για ανανέωση της συνδρομής σας,
                επικοινωνήστε με την ομάδα υποστήριξης του WRAPP ή επισκεφθείτε
                το portal σας.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SubscriptionStatus;
