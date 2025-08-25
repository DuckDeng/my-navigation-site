// 处理 /api/links 请求
export async function onRequestGet(context) {
    const { env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const linksData = await env.NAVIGATION_KV.get('links', 'json');
        
        // 如果没有数据，返回默认示例
        const defaultData = {
            links: [
                {
                    id: "1",
                    title: "Google",
                    url: "https://google.com",
                    category: "搜索",
                    icon: "🔍"
                },
                {
                    id: "2",
                    title: "GitHub", 
                    url: "https://github.com",
                    category: "开发",
                    icon: "💻"
                },
                {
                    id: "3",
                    title: "百度",
                    url: "https://baidu.com",
                    category: "搜索", 
                    icon: "🌐"
                }
            ],
            lastUpdated: new Date().toISOString()
        };

        const data = linksData || defaultData;
        
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('获取链接失败:', error);
        return new Response(JSON.stringify({ 
            error: '获取链接失败',
            message: error.message 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// 处理OPTIONS预检请求
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
    });
}
