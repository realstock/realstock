import { prisma } from "@/lib/prisma";

export interface SocialPostInsights {
    type: string;
    likes: number;
    comments: number;
    shares?: number;
    views: number;
    reach: number;
    publishedDate: Date | string | null;
    permalink: string | null;
}

export interface MetaAdsMetrics {
    reach: number;
    views: number;
    clicks: number;
    spend: number;
    likes: number;
}

/**
 * Obtém o Token de Acesso da Página a partir de um Token de Usuário
 */
export async function getFacebookPageAccessToken(userToken: string, pageId: string): Promise<string | null> {
    try {
        const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
        const pageData = await pageRes.json();
        const pageInfo = pageData.data?.find((p: any) => p.id === pageId);
        return pageInfo?.access_token || null;
    } catch (e) {
        console.error("[SocialInsights] Erro ao obter Token de Página:", e);
        return null;
    }
}

/**
 * Obtém insights de uma mídia do Instagram (Reel ou Carrossel/Imagem)
 */
export async function getInstagramMediaInsights(mediaId: string, igToken: string): Promise<Partial<SocialPostInsights> & { error?: string }> {
    try {
        const baseRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}?fields=like_count,comments_count,timestamp,media_type&access_token=${igToken}`);
        const baseData = await baseRes.json();

        if (!baseData || baseData.error) {
            return { error: baseData?.error?.message || "Erro desconhecido na API do Instagram" };
        }

        const isVideo = baseData.media_type === 'VIDEO';
        const type = isVideo ? 'reels' : (baseData.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'image');

        let views = 0;
        let reach = 0;

        // Métrica 'reach', 'views' e 'saved' são as mais estáveis e unificadas para v21.0+
        // IMPORTANTE: NÃO adicionar 'plays' ou 'impressions' aqui, pois causam Erro 100 em Carrosséis/Reels novos
        const metricName = 'reach,saved,views';
        const insRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}/insights?metric=${metricName}&access_token=${igToken}`);
        const insData = await insRes.json();

        if (insData?.data) {
            const vObj = insData.data.find((m: any) => ['views', 'plays', 'impressions', 'carousel_album_impressions'].includes(m.name));
            if (vObj) views = vObj.values?.[0]?.value || 0;

            const rObj = insData.data.find((m: any) => ['reach', 'carousel_album_reach'].includes(m.name));
            if (rObj) reach = rObj.values?.[0]?.value || 0;
        }

        return {
            type,
            likes: baseData.like_count || 0,
            comments: baseData.comments_count || 0,
            views,
            reach,
            publishedDate: baseData.timestamp
        };
    } catch (e: any) {
        return { error: e.message || "Erro na requisição IG Insights" };
    }
}

/**
 * Obtém insights de um post do Facebook (Reel ou Carrossel/Imagem)
 */
export async function getFacebookPostInsights(postId: string, fbToken: string, postType: string): Promise<Partial<SocialPostInsights> & { error?: string }> {
    try {
        const fields = "id,comments.summary(total_count),likes.summary(total_count),updated_time";
        const res = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=${fields}&access_token=${fbToken}`);
        const fbData = await res.json();

        if (!fbData || fbData.error) {
            return { error: fbData?.error?.message || "Erro desconhecido na API do Facebook" };
        }

        const insights: Partial<SocialPostInsights> = {
            likes: fbData.likes?.summary?.total_count || 0,
            comments: fbData.comments?.summary?.total_count || 0,
            publishedDate: fbData.updated_time,
            views: 0,
            reach: 0,
            shares: 0
        };

        // Tentamos pegar as shares separadamente
        try {
            const sRes = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=shares&access_token=${fbToken}`);
            const sData = await sRes.json();
            if (sData?.shares?.count) {
                insights.shares = sData.shares.count;
            }
        } catch (e) {}

        // Tentamos pegar as views/impressões
        // Primeiro tentamos o campo 'views' direto (comum em vídeos/reels)
        const vRes = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=views&access_token=${fbToken}`);
        const vData = await vRes.json();
        if (vData && !vData.error && vData.views !== undefined) {
            insights.views = vData.views || 0;
        }

        // Fallback para métricas de insights (necessário para Carrosséis/Imagens e alguns Reels)
        // Fazemos requisições individuais para blindar contra métricas depreciadas ou inválidas
        const fbMetrics = postType === 'reels' 
            ? ['post_video_views', 'post_impressions_unique'] 
            : ['post_impressions_unique', 'post_impressions'];

        for (const metric of fbMetrics) {
            try {
                const insRes = await fetch(`https://graph.facebook.com/v21.0/${postId}/insights?metric=${metric}&period=lifetime&access_token=${fbToken}`);
                const insData = await insRes.json();
                if (insData?.data?.[0]?.values?.[0]?.value !== undefined) {
                    const val = insData.data[0].values[0].value;
                    if (metric === 'post_impressions_unique') insights.reach = val;
                    // Usamos a maior métrica disponível para "views"
                    insights.views = Math.max(insights.views || 0, val);
                }
            } catch (e) {}
        }

        return insights;
    } catch (e: any) {
        return { error: e.message || "Erro na requisição FB Insights" };
    }
}

/**
 * Obtém insights de performance paga (Meta Ads)
 */
export async function getMetaAdsInsights(targetIds: string[], pageToken: string): Promise<MetaAdsMetrics> {
    const metrics: MetaAdsMetrics = { reach: 0, views: 0, clicks: 0, spend: 0, likes: 0 };
    
    for (const tId of targetIds) {
        try {
            const adsRes = await fetch(`https://graph.facebook.com/v19.0/${tId}/insights?fields=reach,impressions,inline_link_clicks,spend,actions&date_preset=maximum&access_token=${pageToken}`);
            const adsData = await adsRes.json();
            
            if (adsData?.data?.[0]) {
                const d = adsData.data[0];
                metrics.reach = Math.max(metrics.reach, parseInt(d.reach || "0"));
                metrics.views = Math.max(metrics.views, parseInt(d.impressions || "0"));
                metrics.spend = Math.max(metrics.spend, parseFloat(d.spend || "0"));

                let c = parseInt(d.inline_link_clicks || "0");
                if (d.actions) {
                    const linkClicks = d.actions.find((a: any) => a.action_type === 'link_click')?.value;
                    if (linkClicks) c = Math.max(c, parseInt(linkClicks));
                    
                    const reactions = d.actions.find((a: any) => a.action_type === 'post_reaction' || a.action_type === 'like')?.value;
                    if (reactions) metrics.likes = (metrics.likes || 0) + parseInt(reactions);
                }
                metrics.clicks = Math.max(metrics.clicks, c);
            }
        } catch (e) {
            console.error(`[SocialInsights] Erro ao buscar Meta Ads para ${tId}:`, e);
        }
    }
    return metrics;
}
