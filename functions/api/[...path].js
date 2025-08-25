// Cloudflare Pages Functions API
// 文件路径: functions/api/[...path].js

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/', '');

    // CORS头部
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // 获取链接列表
        if (path === 'links' && request.method === 'GET') {
            return await getLinks(env, corsHeaders);
        }
        
        // Webhook接口 - 更新链接
        if (path === 'webhook' && request.method === 'POST') {
            return await handleWebhook(request, env, corsHeaders);
        }

        return new Response('API路径不存在', { 
            status: 404, 
            headers: corsHeaders 
        });

    } catch (error) {
        console.error('API错误:', error);
        return new Response(JSON.stringify({ 
            error: '服务器内部错误',
            message: error.message 
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

// 获取链接数据
async function getLinks(env, corsHeaders) {
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
                }
            ],
            lastUpdated: new Date().toISOString()
        };

        const data = linksData || defaultData;
        
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        throw new Error(`获取链接失败: ${error.message}`);
    }
}

// 处理Webhook请求
async function handleWebhook(request, env, corsHeaders) {
    try {
        // 验证授权
        const authHeader = request.headers.get('Authorization');
        const expectedToken = env.WEBHOOK_SECRET; // 在环境变量中设置
        
        if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
            return new Response(JSON.stringify({ error: '未授权访问' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const payload = await request.json();
        const { action, link, links } = payload;

        // 获取当前数据
        let currentData = await env.NAVIGATION_KV.get('links', 'json') || { links: [] };
        
        switch (action) {
            case 'add':
                // 添加新链接
                if (!link || !link.title || !link.url) {
                    throw new Error('缺少必要的链接信息');
                }
                link.id = link.id || Date.now().toString();
                currentData.links.push(link);
                break;
                
            case 'update':
                // 更新现有链接
                if (!link || !link.id) {
                    throw new Error('缺少链接ID');
                }
                const index = currentData.links.findIndex(l => l.id === link.id);
                if (index === -1) {
                    throw new Error('未找到要更新的链接');
                }
                currentData.links[index] = { ...currentData.links[index], ...link };
                break;
                
            case 'delete':
                // 删除链接
                if (!link || !link.id) {
                    throw new Error('缺少链接ID');
                }
                currentData.links = currentData.links.filter(l => l.id !== link.id);
                break;
                
            case 'replace':
                // 替换全部链接
                if (!links || !Array.isArray(links)) {
                    throw new Error('无效的链接数组');
                }
                currentData.links = links;
                break;
                
            default:
                throw new Error('不支持的操作类型');
        }

        // 更新时间戳
        currentData.lastUpdated = new Date().toISOString();

        // 保存到KV
        await env.NAVIGATION_KV.put('links', JSON.stringify(currentData));

        return new Response(JSON.stringify({ 
            success: true, 
            message: '链接更新成功',
            count: currentData.links.length 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Webhook处理错误:', error);
        return new Response(JSON.stringify({ 
            error: error.message 
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}
