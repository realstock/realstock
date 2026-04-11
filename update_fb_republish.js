const fs = require('fs');

function updateCaptureFb(filePath) {
    let data = fs.readFileSync(filePath, 'utf8');
    
    // Inject Old Session Deletion Logic before the final Post ID is used
    if (data.includes('// Extrair o Page Access Token') && !data.includes('const oldSession')) {
        const deleteLogic = `
    const oldSession = await prisma.facebookFeedSession.findFirst({
        where: { listingId: property.id },
        orderBy: { createdAt: 'desc' }
    });
    
    if (oldSession && oldSession.publishedPostId) {
        try {
            console.log("Deleting old fb post: " + oldSession.publishedPostId);
            await fetch(\`\${BASE_GRAPH}/\${oldSession.publishedPostId}?access_token=\${pageToken}\`, { method: 'DELETE' });
            await prisma.facebookFeedSession.update({
                where: { id: oldSession.id },
                data: { status: 'DELETED' }
            });
        } catch(e) { console.error("Could not delete old post", e); }
    }
`;
        data = data.replace('// Publish to Facebook Graph API', deleteLogic + '\n    // Publish to Facebook Graph API');
        fs.writeFileSync(filePath, data);
        console.log("Updated " + filePath);
    }
}

updateCaptureFb('/Users/leobatisti/realstock/app/api/paypal/capture-facebook-order/route.ts');
