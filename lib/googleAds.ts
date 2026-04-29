import { GoogleAdsApi, enums } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
});

export const getGoogleAdsCustomer = () => {
  return client.Customer({
    customer_id: process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID || '',
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  });
};

export async function createRealStockGoogleCampaign(
  propertyId: number,
  propertyTitle: string,
  dailyBudgetBrl: number,
  targetUrl: string,
  city?: string,
  state?: string,
  category?: string,
  propertyType?: string
) {
  try {
    const customer = getGoogleAdsCustomer();

    // 1. Create Budget (dailyBudgetBrl in micro-reais)
    const microAmount = Math.floor(dailyBudgetBrl * 1000000);

    const budgetRes = await customer.campaignBudgets.create([
      {
        name: `Budget - Imóvel ${propertyId} - ${Date.now()}`,
        amount_micros: microAmount,
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      },
    ]);
    const budgetResourceName = budgetRes.results[0].resource_name;

    // 2. Create Campaign
    const campaignRes = await customer.campaigns.create([
      {
        name: `Campanha Imóvel - ${propertyId} - ${Date.now()}`,
        status: enums.CampaignStatus.ENABLED, 
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
          target_partner_search_network: false,
        },
        campaign_budget: budgetResourceName,
        manual_cpc: {
           enhanced_cpc_enabled: false
        },
        contains_eu_political_advertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      } as any,
    ]);
    const campaignResourceName = campaignRes.results[0].resource_name;

    // 3. Create AdGroup
    const groupName = `Grupo - ${propertyTitle}`.substring(0, 255);
    const adGroupRes = await customer.adGroups.create([
      {
        campaign: campaignResourceName,
        name: groupName,
        type: enums.AdGroupType.SEARCH_STANDARD,
        status: enums.AdGroupStatus.ENABLED,
        cpc_bid_micros: 2000000 // R$ 2.00 por clique de teto
      },
    ]);
    const adGroupResourceName = adGroupRes.results[0].resource_name;

    // 4. Create Ad
    const safeTitle = propertyTitle.length > 30 ? propertyTitle.substring(0, 27) + "..." : propertyTitle;
    
    await customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: enums.AdGroupAdStatus.ENABLED,
        ad: {
          responsive_search_ad: {
            headlines: [
              { text: "Lindo Imóvel Disponível", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
              { text: safeTitle, pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
              { text: "Agende sua visita na RealStock", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
              { text: "Oportunidade de Investimento", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
              { text: "Imóveis Exclusivos RealStock", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
            ],
            descriptions: [
              { text: "Venha conhecer esta excelente oportunidade exclusiva da RealStock. Agende online agora mesmo." },
              { text: "Opção imperdível para compra ou locação. Fale com um de nossos corretores experts e feche negócio." },
              { text: "Encontre os melhores imóveis da sua região com a RealStock. Facilidade e transparência." },
            ],
            path1: "imovel",
            path2: propertyId.toString().substring(0, 15),
          },
          final_urls: [targetUrl],
        },
      },
    ]);

    // 5. Add Keywords
    const keywordTexts = [
        "comprar imovel",
        propertyTitle.toLowerCase(),
        `imovel ${propertyId}`,
        "realstock imoveis"
    ];

    if (category) {
        keywordTexts.push(category.toLowerCase());
        keywordTexts.push(`comprar ${category.toLowerCase()}`);
    }
    if (propertyType) {
        keywordTexts.push(propertyType.toLowerCase());
    }

    if (state) {
        keywordTexts.push(`imovel em ${state.toLowerCase()}`);
    }

    await customer.adGroupCriteria.create(
        keywordTexts.map(text => ({
            ad_group: adGroupResourceName,
            status: enums.AdGroupCriterionStatus.ENABLED,
            keyword: {
                text: text.substring(0, 80),
                match_type: enums.KeywordMatchType.PHRASE
            }
        }))
    );

    // 6. Add Location Targeting (State or Brazil)
    let locationId = "2076"; // Brazil Default

    if (state) {
        const stateMap: { [key: string]: string } = {
            "AC": "20074", "ACRE": "20074",
            "AL": "20075", "ALAGOAS": "20075",
            "AP": "20076", "AMAPA": "20076",
            "AM": "20094", "AMAZONAS": "20094",
            "BA": "20077", "BAHIA": "20077",
            "CE": "20078", "CEARA": "20078",
            "DF": "20080", "DISTRITO FEDERAL": "20080",
            "ES": "20081", "ESPIRITO SANTO": "20081",
            "GO": "20082", "GOIAS": "20082",
            "MA": "20083", "MARANHAO": "20083",
            "MT": "20096", "MATO GROSSO": "20096",
            "MS": "20085", "MATO GROSSO DO SUL": "20085",
            "MG": "20084", "MINAS GERAIS": "20084",
            "PA": "20095", "PARA": "20095",
            "PB": "20097", "PARAIBA": "20097",
            "PR": "20086", "PARANA": "20086",
            "PE": "20087", "PERNAMBUCO": "20087",
            "PI": "20098", "PIAUI": "20098",
            "RJ": "20088", "RIO DE JANEIRO": "20088",
            "RN": "20099", "RIO GRANDE DO NORTE": "20099",
            "RS": "20089", "RIO GRANDE DO SUL": "20089",
            "RO": "20101", "RONDONIA": "20101",
            "RR": "20102", "RORAIMA": "20102",
            "SC": "20091", "SANTA CATARINA": "20091",
            "SP": "20092", "SAO PAULO": "20092",
            "SE": "20103", "SERGIPE": "20103",
            "TO": "20104", "TOCANTINS": "20104"
        };

        const normalizedState = state.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (stateMap[normalizedState]) {
            locationId = stateMap[normalizedState];
        }
    }

    await customer.campaignCriteria.create([
        {
            campaign: campaignResourceName,
            location: {
                geo_target_constant: `geoTargetConstants/${locationId}`
            }
        }
    ]);

    const campaignId = campaignResourceName?.split('/')[3] || "";
    const adGroupId = adGroupResourceName?.split('/')[3] || "";

    return { campaignId, adGroupId, success: true };
  } catch (err: any) {
    console.error("Google Ads API Creation Error:", err);
    return { success: false, error: err.message };
  }
}

export async function getGoogleAdsCampaignInsights(campaignId: string) {
  try {
    const customer = getGoogleAdsCustomer();

    // GAQL query to fetch metrics for a specific campaign
    const query = `
      SELECT
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        campaign.status
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const result = await customer.query(query);

    if (result && result.length > 0) {
      const metrics = result[0].metrics as any;
      
      return {
        success: true,
        clicks: Number(metrics.clicks) || 0,
        impressions: Number(metrics.impressions) || 0,
        ctr: Number(metrics.ctr) ? (Number(metrics.ctr) * 100).toFixed(2) : "0.00",
        // cost and cpc are in micros
        cost: Number(metrics.cost_micros) ? (Number(metrics.cost_micros) / 1000000) : 0,
        cpc: Number(metrics.average_cpc) ? (Number(metrics.average_cpc) / 1000000) : 0,
        status: result[0].campaign?.status || "UNKNOWN"
      };
    }

    return { success: false, error: "Campanha não encontrada" };
  } catch (err: any) {
    console.error("Google Ads API Analytics Error:", err);
    return { success: false, error: err.message };
  }
}
