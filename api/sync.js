export default async function handler(req, res) {
    const { GITHUB_TOKEN, GITHUB_USER, GITHUB_REPO } = process.env;
    const { path = 'data.json', method = 'GET', content, message, sha } = req.body || req.query;

    // Security Check
    if (!GITHUB_TOKEN) {
        return res.status(500).json({ error: 'Server Configuration Error: GITHUB_TOKEN missing' });
    }

    const repoUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${path}`;

    try {
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
        
        else if (req.method === 'POST' || req.method === 'PUT') {
            // Write to GitHub
            const body = {
                message: message || `Update ${path}`,
                content: content,
                sha: sha
            };

            const response = await fetch(repoUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok) {
                return res.status(response.status).json(data);
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
