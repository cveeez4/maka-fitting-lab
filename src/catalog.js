export const catalog=[
 {id:'wide',code:'01',title:'واسعة بخطين',description:'قَصّة واسعة مقفولة · خطّان طوليان · ياقة مرتفعة',type:'closed',features:['قَصّة واسعة','خطّان طوليان','ياقة مرتفعة'],colors:[{label:'أسود',hex:'#17171b',ref:'wide-black'}],ease:36},
 {id:'contrast',code:'02',title:'مفتوحة بأساور',description:'طبقة داخلية فاتحة · ربطة رقبة · أساور مزخرفة',type:'open',features:['داخلية فاتحة','ربطة رقبة','أساور مزخرفة'],colors:[{label:'فوشيا',hex:'#9d174c',ref:'contrast-magenta'},{label:'رملي',hex:'#c4ae92',ref:'contrast-sand'},{label:'أزرق',hex:'#183baf',ref:'contrast-blue'},{label:'بني',hex:'#76484b',ref:'contrast-brown'}],ease:26},
 {id:'belt',code:'03',title:'حزام وكم مزموم',description:'طبقتان بنفس اللون · حزام وسط · كم مزموم بكشكشة',type:'belted',features:['حزام بربطة','كم مزموم','طبقتان متقاربتان'],colors:[{label:'موف',hex:'#b39ac0',ref:'belt-lilac'},{label:'كحلي',hex:'#16283e',ref:'belt-navy'},{label:'وردي',hex:'#cf8b94',ref:'belt-rose'}],ease:24},
 {id:'silver',code:'04',title:'حواف فضية',description:'كيمونو مفتوح · داخلية فاتحة · تشطيب فضي أمامي وعلى الكم',type:'trimmed',features:['حواف فضية','كم أضيق','داخلية فاتحة'],colors:[{label:'أسود',hex:'#20212b',ref:'silver-black'},{label:'بنفسجي',hex:'#5f5592',ref:'silver-purple'}],ease:20}
];
export const getProduct=id=>catalog.find(p=>p.id===id)||catalog[0];
