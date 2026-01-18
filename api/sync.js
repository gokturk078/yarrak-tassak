export default async function handler(req, res) {
    const { GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO } = process.env;

    // Security Check
    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'Server Configuration Error: GITHUB_TOKEN missing' });
    }

    // Disable Vercel Functions Caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        // Parse Body strictly
        let bodyParsed = req.body;
        if (typeof bodyParsed === 'string') {
            try { bodyParsed = JSON.parse(bodyParsed); } catch (e) { }
        }

        const { path = 'data.json', content, message, sha } = bodyParsed || req.query || {};
        const repoUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;

        // GET REQUEST
        if (req.method === 'GET') {
            const response = await fetch(repoUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.status === 404) {
                return res.status(404).json({ error: 'File not found' });
            }

            const data = await response.json();
            return res.status(200).json(data);
        }

        // POST/PUT REQUEST (Save/Upload)
        else if (req.method === 'POST' || req.method === 'PUT') {
            if (!content) {
                return res.status(400).json({ error: 'Content is required' });
            }

            // Construct GitHub Payload
            const ghBody = {
                message: message || `Update ${path}`,
                content: content
            };

            // CRITICAL: Only add SHA if it exists and is not null/empty
            // GitHub creates a new file if SHA is omitted. Updates if SHA is provided.
            if (sha) {
                ghBody.sha = sha;
            }

            const response = await fetch(repoUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(ghBody)
            });

            const data = await response.json();

            if (!response.ok) {
                // Return exact GitHub error code and message
                return res.status(response.status).json({
                    error: data.message || 'GitHub API Error',
                    details: data
                });
            }

            return res.status(200).json(data);
        }

        else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
