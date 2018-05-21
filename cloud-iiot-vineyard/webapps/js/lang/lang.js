//for mandarin language use 'mnd' and for english use 'en'
var currentLangData1, currentLangData2, currentLangDataChart;
var langSet = [{
        "en1": [
            "Temperature is out of range for aging process.",
            "Edge gateway runs local processing functions and triggers immediate action.",
            "HVAC adjustment made to bring temperature within ideal range."
        ],
        "en2": [
            "Pallet has left the warehouse.",
            "Edge gateway uses cloud solution to confirm scheduled shipment.",
            "Shipment departure notice sent to cloud, and delivery tracking initiated."
        ]
    },
    {
        "mnd1": [
            "温度超过熟成范围",
            "边缘网关运行本地处理功能及触发操作。",
            "已进行暖通空调调整将温度调整至理想范围。"
        ],
        "mnd2": [
            "货盘已离开仓库。",
            "边缘网关使用云解决方案来确认定时任务的状态。",
            "货件出发通知已发送至云端，配送跟踪已启动。"
        ]
    },
    {
        "por1": [
            "A temperatura está fora da faixa de processo de envelhecimento",
            "O edge gateway executa as funções de processamento local e desencadeia ação imediata.",
            "Ajuste de AVAC feito para levar a temperatura à faixa ideal."
        ],
        "por2": [
            "A palete saiu do armazém.",
            "O edge gateway utiliza a solução da nuvem para confirmar a remessa programada.",
            "Notificação de partida de remessa enviada para a nuvem e rastreamento da entrega iniciado."
        ]
    }
];
var chartLang = [{ "en": { 'heading': 'Temperature', 'yAxis': 'Temperature (C)', 'time': 'Time' } }, { "mnd": { 'heading': '温度', 'yAxis': '温度 (C)', 'time': '时间' } }, { "por": { 'heading': 'Temperatura', 'yAxis': 'Temperatura (C)', 'time': 'Hora' } }];
/*if (lang == 'en') {
	currentLangData1 = langSet[0].en1;
	currentLangData2 = langSet[0].en2;
	currentLangDataChart  = chartLang[0].en;
}
if (lang == 'mnd') {
	currentLangData1 = langSet[1].mnd1;
	currentLangData2 = langSet[1].mnd2;
	currentLangDataChart  = chartLang[1].mnd;
}*/