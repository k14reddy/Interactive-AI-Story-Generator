import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ThemeInput from "./ThemeInput.jsx";
import LoadingStatus from "./LoadingStatus.jsx";
import { API_BASE_URL } from "../util.js";

function StoryGenerator() {
    const navigate = useNavigate();

    const [theme, setTheme] = useState("");
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const generateStory = async (theme) => {
        setLoading(true);
        setError(null);
        setTheme(theme);

        try {
            const response = await axios.post(
                `${API_BASE_URL}/stories/create`,
                { theme }
            );

            const { job_id, status } = response.data;

            console.log("Created job:", job_id);
            console.log("Initial status:", status);

            setJobId(job_id);
            setJobStatus(status);

            // Start polling
            pollJobStatus(job_id);

        } catch (e) {
            console.error("Create story error:", e);

            setLoading(false);
            setError(`Failed to generate story: ${e.message}`);
        }
    };

    const pollJobStatus = async (id) => {
        try {
            console.log("Checking job:", id);

            const response = await axios.get(
                `${API_BASE_URL}/jobs/${id}`
            );

            const {
                status,
                story_id,
                error: jobError
            } = response.data;

            console.log("Job response:", response.data);

            setJobStatus(status);

            // =========================
            // STORY COMPLETED
            // =========================
            if (status === "completed") {
                if (story_id) {
                    console.log("Story completed:", story_id);

                    setLoading(false);

                    navigate(`/story/${story_id}`);
                    return;
                }

                console.error("Job completed but story_id is missing");

                setError("Story completed but no story ID was returned.");
                setLoading(false);
                return;
            }

            // =========================
            // STORY FAILED
            // =========================
            if (status === "failed" || jobError) {
                console.error("Story generation failed:", jobError);

                setError(
                    jobError || "Failed to generate story"
                );

                setLoading(false);
                return;
            }

            // =========================
            // STILL PROCESSING
            // =========================
            if (status === "pending" || status === "processing") {
                console.log(
                    `Job is ${status}. Checking again in 5 seconds...`
                );

                setTimeout(() => {
                    pollJobStatus(id);
                }, 5000);

                return;
            }

            // Unknown status
            console.error("Unknown job status:", status);

            setError(`Unknown job status: ${status}`);
            setLoading(false);

        } catch (e) {
            console.error("Polling error:", e);

            if (e.response?.status === 404) {
                // Job may not be visible immediately.
                // Try again.
                setTimeout(() => {
                    pollJobStatus(id);
                }, 5000);

                return;
            }

            setError(
                `Failed to check story status: ${e.message}`
            );

            setLoading(false);
        }
    };

    const reset = () => {
        setJobId(null);
        setJobStatus(null);
        setError(null);
        setTheme("");
        setLoading(false);
    };

    return (
        <div className="story-generator">

            {error && (
                <div className="error-message">
                    <p>{error}</p>

                    <button onClick={reset}>
                        Try Again
                    </button>
                </div>
            )}

            {!jobId && !error && !loading && (
                <ThemeInput onSubmit={generateStory} />
            )}

            {loading && (
                <LoadingStatus theme={theme} />
            )}

        </div>
    );
}

export default StoryGenerator;