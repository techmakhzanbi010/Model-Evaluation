import { useState, type FormEvent } from "react";
import "./App.css";

const API_BASE_URL = "https://productclassificationml-test-production.up.railway.app";
// const API_BASE_URL = "http://localhost:8000";

interface ProminentFeature {
    attribute: string;
    value: string | number | boolean | null;
    impact: number;
    share: number;
    direction: string;
}

interface PredictionResponse {
    asin: string;
    predicted_label: string;
    probability: number;
    confidence_level: string;
    most_prominent_feature: ProminentFeature | null;
    summary: string;
    features_used: Record<string, string | number | boolean | null>;
}

function formatFeatureValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    if (typeof value === "number") {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("fee %") || lowerKey.includes("oos")) {
            return `${value}%`;
        }
        if (lowerKey.includes("fee") || lowerKey.startsWith("new:")) {
            return `$${value.toFixed(2)}`;
        }
        if (lowerKey.includes("rank")) {
            return `#${value.toLocaleString()}`;
        }
        if (lowerKey.includes("weight")) {
            return `${value.toLocaleString()} g`;
        }
        if (lowerKey.includes("bought")) {
            return `${value.toLocaleString()} / mo`;
        }
        return value.toLocaleString();
    }

    return String(value);
}

export default function PredictionPage() {
    const [asin, setAsin] = useState("B0CZRJTGHV");
    const [result, setResult] = useState<PredictionResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handlePredict(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const cleanAsin = asin.trim().toUpperCase();
        if (!cleanAsin) {
            setError("Please enter an ASIN.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/predict/asin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ asin: cleanAsin }),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(message || `Request failed (${response.status})`);
            }

            const data: PredictionResponse = await response.json();
            setResult(data);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to connect to the prediction API."
            );
        } finally {
            setLoading(false);
        }
    }

    const formattedProbability = result
        ? result.probability < 0.0001
            ? "< 0.01%"
            : `${(result.probability * 100).toFixed(2)}%`
        : "";

    return (
        <div className="page-wrapper">
            {/* Top Bar: only shows ASIN prediction */}
            <header className="top-bar">
                <h1>ASIN Prediction</h1>
            </header>

            <main className="content-container">
                {/* Input Field for ASIN */}
                <section className="search-section">
                    <form onSubmit={handlePredict} className="search-form">
                        <input
                            type="text"
                            placeholder="Enter ASIN (e.g. B0CZRJTGHV)"
                            value={asin}
                            onChange={(e) => setAsin(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? "Predicting..." : "Predict"}
                        </button>
                    </form>
                    {error && <div className="error-alert">{error}</div>}
                </section>

                {/* Section: Extracted Features Grid */}
                {result && (
                    <section className="section-block">
                        <div className="section-header">
                            <h2>Extracted Features</h2>
                            <span className="count-pill">
                                {Object.keys(result.features_used).length}
                            </span>
                        </div>
                        <div className="features-grid">
                            {Object.entries(result.features_used).map(([key, val]) => (
                                <div key={key} className="feature-card">
                                    <div className="feature-key" title={key}>
                                        {key}
                                    </div>
                                    <div className="feature-value">
                                        {formatFeatureValue(key, val)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Section: Prediction Overview (Label, Confidence, Summary, Most Prominent Feature) */}
                {result && (
                    <section className="section-block prediction-results-block">
                        <div className="section-header">
                            <h2>Prediction & Details</h2>
                        </div>

                        <div className="results-grid">
                            {/* Label */}
                            <div className="result-card">
                                <span className="result-label">Predicted Label</span>
                                <span
                                    className={`status-badge ${result.predicted_label.toLowerCase() === "rejected"
                                        ? "badge-rejected"
                                        : "badge-selected"
                                        }`}
                                >
                                    {result.predicted_label}
                                </span>
                            </div>

                            {/* Confidence */}
                            <div className="result-card">
                                <span className="result-label">Confidence</span>
                                <div className="result-value-group">
                                    <span className="confidence-level">
                                        {result.confidence_level.toUpperCase()}
                                    </span>
                                    <span className="confidence-prob">
                                        {formattedProbability}
                                    </span>
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="result-card summary-card">
                                <span className="result-label">Summary</span>
                                <p className="summary-text">{result.summary}</p>
                            </div>

                            {/* Most Prominent Feature */}
                            {result.most_prominent_feature && (
                                <div className="result-card prominent-card">
                                    <span className="result-label">
                                        Most Prominent Feature
                                    </span>
                                    <div className="prominent-title">
                                        {result.most_prominent_feature.attribute}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
