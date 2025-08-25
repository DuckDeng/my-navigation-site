// 处理 /api/webhook 请求
export async function onRequestPost(context) {
    const { request, env } = context;
    
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    try {
        // 验证授权
        const authHeader = request.headers.get('Authorization');
        const expectedToken = env.WEBHOOK_SECRET; // 在环境变量中设置
        
        if (!expectedToken) {
            return new Response(JSON.stringify({ 
                error: '服务器配置错误：未设置WEBHOOK_SECRET' 
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }
        
        if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
            return new Response(JSON.stringify({ error: '未授权访问' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const payload = await request.json();
        const { action, link, links } = payload;

        if (!action) {
            return new Response(JSON.stringify({ error: '缺少action参数' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 获取当前数据
        let currentData = await env.NAVIGATION_KV.get('links', 'json') || { links: [] };
        
        switch (action) {
            case 'add':
                // 添加新链接
                if (!link || !link.title || !link.url) {
                    throw new Error('缺少必要的链接信息 (title, url)');
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
                const originalCount = currentData.links.length;
                currentData.links = currentData.links.filter(l => l.id !== link.id);
                if (currentData.links.length === originalCount) {
                    throw new Error('未找到要删除的链接');
                }
                break;
                
            case 'replace':
                // 替换全部链接
                if (!links || !Array.isArray(links)) {
                    throw new Error('无效的链接数组');
                }
                currentData.links = links;
                break;
                
            default:
                throw new Error(`不支持的操作类型: ${action}`);
        }

        // 更新时间戳
        currentData.lastUpdated = new Date().toISOString();

        // 保存到KV
        await env.NAVIGATION_KV.put('links', JSON.stringify(currentData));

        return new Response(JSON.stringify({ 
            success: true, 
            message: `链接${action}成功`,
            count: currentData.links.length,
            lastUpdated: currentData.lastUpdated
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

// 处理OPTIONS预检请求
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
}
