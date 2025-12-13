export interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
  tags?: string[];
}

export const LEGAL_TEMPLATES: Template[] = [
  // ==========================================
  // 一、 民事与婚姻家庭 (Civil & Family)
  // ==========================================
  {
    id: 'civil-loan',
    title: '个人借款合同 (防赖账版)',
    category: '民事纠纷',
    description: '适用于自然人借贷，特别增加了“送达地址确认”和“律师费承担”条款，极大降低诉讼成本。',
    tags: ['借钱', '欠条', '民间借贷'],
    content: `
      <h1 style="text-align: center;">借 款 合 同</h1>
      <p style="text-align: right;">合同编号：<span style="background-color: #fef08a">[编号]</span></p>
      
      <h3>一、当事人信息</h3>
      <p><strong>出借人（甲方）：</strong><span style="background-color: #fef08a">[姓名]</span>，身份证号：<span style="background-color: #fef08a">[号码]</span>，联系电话：<span style="background-color: #fef08a">[电话]</span>。</p>
      <p><strong>借款人（乙方）：</strong><span style="background-color: #fef08a">[姓名]</span>，身份证号：<span style="background-color: #fef08a">[号码]</span>，联系电话：<span style="background-color: #fef08a">[电话]</span>。</p>
      <p><strong>担保人（丙方）：</strong><span style="background-color: #fef08a">[姓名]</span>，身份证号：<span style="background-color: #fef08a">[号码]</span>。</p>

      <h3>二、借款核心条款</h3>
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
        <tr><td style="border: 1px solid #000; padding: 8px;">借款金额</td><td style="border: 1px solid #000; padding: 8px;">人民币（大写）<span style="background-color: #fef08a">_____________</span>元整</td></tr>
        <tr><td style="border: 1px solid #000; padding: 8px;">借款用途</td><td style="border: 1px solid #000; padding: 8px;"><span style="background-color: #fef08a">[用途，如房屋装修]</span>，严禁用于赌博等违法活动。</td></tr>
        <tr><td style="border: 1px solid #000; padding: 8px;">借款期限</td><td style="border: 1px solid #000; padding: 8px;">自____年__月__日起至____年__月__日止。</td></tr>
        <tr><td style="border: 1px solid #000; padding: 8px;">利息约定</td><td style="border: 1px solid #000; padding: 8px;">年利率<span style="background-color: #fef08a">___%</span>（不超过LPR 4倍）。</td></tr>
      </table>

      <h3>三、违约责任（核心风控）</h3>
      <p>1. 乙方逾期还款的，应按未还金额的<strong>日千分之一</strong>支付违约金。</p>
      <p>2. 乙方违约导致甲方诉讼的，甲方为此支付的<strong>律师费、诉讼费、保全费、差旅费</strong>等所有维权费用均由乙方承担。</p>

      <h3>四、送达地址确认</h3>
      <p>各方确认本合同首部列明的地址为有效司法送达地址，法院文书一旦寄出即视为送达。</p>
      
      <br>
      <p>甲方签章：________________ 乙方签章：________________</p>
    `
  },
  {
    id: 'civil-divorce',
    title: '自愿离婚协议书',
    category: '婚姻家庭',
    description: '适用于双方无争议离婚，明确财产分割、子女抚养权及探视规则。',
    tags: ['离婚', '抚养权', '财产分割'],
    content: `
      <h1 style="text-align: center;">自 愿 离 婚 协 议 书</h1>
      
      <p>男方：<span style="background-color: #fef08a">[姓名]</span>，身份证号：<span style="background-color: #fef08a">[号码]</span>。</p>
      <p>女方：<span style="background-color: #fef08a">[姓名]</span>，身份证号：<span style="background-color: #fef08a">[号码]</span>。</p>
      
      <p>双方于____年__月__日登记结婚，现因感情破裂，自愿协议离婚，并达成如下一致意见：</p>
      
      <h3>一、子女抚养</h3>
      <p>1. 婚生子/女<span style="background-color: #fef08a">[姓名]</span>由<span style="background-color: #fef08a">[男方/女方]</span>抚养，随同生活。</p>
      <p>2. 另一方每月支付抚养费人民币<span style="background-color: #fef08a">____</span>元，直至子女年满18周岁。</p>
      <p>3. 探视权：每周<span style="background-color: #fef08a">[时间]</span>可探视，寒暑假各分配一半时间。</p>
      
      <h3>二、财产分割</h3>
      <p>1. <strong>房产：</strong>位于<span style="background-color: #fef08a">[地址]</span>的房屋归<span style="background-color: #fef08a">[方]</span>所有，剩余房贷由其自行偿还。</p>
      <p>2. <strong>车辆：</strong>牌号为<span style="background-color: #fef08a">[车牌]</span>的车辆归<span style="background-color: #fef08a">[方]</span>所有。</p>
      <p>3. <strong>存款：</strong>各自名下的银行存款归各自所有。</p>
      
      <h3>三、债务处理</h3>
      <p>双方确认无共同债务。若离婚后发现隐瞒的债务，由借债方自行承担。</p>
      
      <br>
      <p>男方（签字）：______________ 女方（签字）：______________</p>
    `
  },
  {
    id: 'civil-will',
    title: '自书遗嘱',
    category: '婚姻家庭',
    description: '立遗嘱人亲笔书写，明确身后财产分配，需注意必须全文手写才有效（本模板仅供参考结构）。',
    tags: ['遗嘱', '继承', '房产'],
    content: `
      <h1 style="text-align: center;">遗 嘱</h1>
      
      <p><strong>立遗嘱人：</strong><span style="background-color: #fef08a">[姓名]</span>，身份证号：<span style="background-color: #fef08a">[号码]</span>。</p>
      
      <p>本人神志清醒，为避免身后产生纠纷，特立本遗嘱，对本人名下财产作如下处理：</p>
      
      <h3>一、财产范围</h3>
      <p>1. 位于<span style="background-color: #fef08a">[地址]</span>的房屋一套。</p>
      <p>2. 银行存款及理财产品。</p>
      
      <h3>二、继承分配</h3>
      <p>1. 上述房产由<span style="background-color: #fef08a">[继承人姓名]</span>（身份证号：...）个人继承，不属于其夫妻共同财产。</p>
      <p>2. 其余存款由<span style="background-color: #fef08a">[继承人姓名]</span>继承。</p>
      
      <h3>三、遗嘱执行人</h3>
      <p>指定<span style="background-color: #fef08a">[姓名]</span>为本遗嘱的执行人。</p>
      
      <p style="color: red; font-weight: bold;">（注：打印版遗嘱可能无效，请务必参照此内容全文亲笔手写，并注明年、月、日）</p>
      
      <br>
      <p>立遗嘱人（签名）：________________</p>
      <p>日期：____年__月__日</p>
    `
  },
  {
    id: 'civil-debt-ack',
    title: '还款协议书 (欠条)',
    category: '民事纠纷',
    description: '针对已发生的债务，确认欠款总额并约定分期还款计划。',
    tags: ['欠条', '还钱', '分期'],
    content: `
      <h1 style="text-align: center;">还 款 协 议 书</h1>
      
      <p>甲方（债权人）：<span style="background-color: #fef08a">[姓名]</span></p>
      <p>乙方（债务人）：<span style="background-color: #fef08a">[姓名]</span></p>
      
      <p>截止至____年__月__日，乙方确认尚欠甲方本金人民币<span style="background-color: #fef08a">_______</span>元，利息_______元。现双方协商达成如下还款计划：</p>
      
      <h3>一、还款计划</h3>
      <p>1. ____年__月__日前，归还人民币_______元；</p>
      <p>2. ____年__月__日前，归还剩余全部款项。</p>
      
      <h3>二、加速到期条款</h3>
      <p>若乙方任何一期未按时足额还款，甲方有权宣布剩余全部未还款项立即到期，并要求乙方立即清偿。</p>
      
      <p>乙方签字：________________</p>
    `
  },

  // ==========================================
  // 二、 商事与公司治理 (Commercial & Corp)
  // ==========================================
  {
    id: 'biz-shareholder',
    title: '股东合作协议 (合伙创业)',
    category: '公司治理',
    description: '合伙开公司必备，明确出资比例、股权分配、分红机制及退出路径。',
    tags: ['合伙', '股权', '分红'],
    content: `
      <h1 style="text-align: center;">股 东 合 作 协 议</h1>
      
      <p>甲方：<span style="background-color: #fef08a">[姓名/公司]</span> 乙方：<span style="background-color: #fef08a">[姓名/公司]</span></p>
      
      <h3>一、公司概况</h3>
      <p>拟设立公司名称：<span style="background-color: #fef08a">________有限公司</span>，注册资本：____万元。</p>
      
      <h3>二、出资与持股</h3>
      <table style="width: 100%; border-collapse: collapse; text-align: center;">
        <tr><th>股东</th><th>出资额</th><th>出资方式</th><th>持股比例</th></tr>
        <tr><td>甲方</td><td>___万</td><td>货币/技术</td><td>___%</td></tr>
        <tr><td>乙方</td><td>___万</td><td>货币</td><td>___%</td></tr>
      </table>
      
      <h3>三、股权成熟与退出（Vesting）</h3>
      <p>1. 创始人股权分4年成熟，每年成熟25%。</p>
      <p>2. 中途主动离职或因过错被开除的，公司有权以<span style="background-color: #fef08a">1元/注册资本</span>的价格回购其未成熟股权。</p>
      
      <h3>四、分红策略</h3>
      <p>公司预留____%的利润作为发展公积金，其余利润按持股比例进行年度分红。</p>
    `
  },
  {
    id: 'biz-equity-transfer',
    title: '股权转让协议',
    category: '公司治理',
    description: '用于公司股东之间或向外部第三方转让股权，包含工商变更条款。',
    tags: ['股权', '买卖', '工商变更'],
    content: `
      <h1 style="text-align: center;">股 权 转 让 协 议</h1>
      
      <p>转让方（甲方）：__________ 受让方（乙方）：__________</p>
      <p>目标公司：__________有限公司</p>
      
      <h3>一、转让标的</h3>
      <p>甲方同意将其持有的目标公司____%的股权（对应注册资本____万元）转让给乙方。</p>
      
      <h3>二、转让价格及支付</h3>
      <p>1. 转让价格：共计人民币<span style="background-color: #fef08a">_______</span>元。</p>
      <p>2. 支付方式：合同签订后3日内支付50%，工商变更完成后3日内支付剩余50%。</p>
      
      <h3>三、债权债务承担</h3>
      <p>股权转让完成前目标公司的债权债务由原股东承担（或按比例），转让完成后由公司承担。</p>
    `
  },
  {
    id: 'biz-purchase',
    title: '产品采购合同',
    category: '商事合同',
    description: '适用于企业间货物买卖，明确质量标准、验收流程及付款周期。',
    tags: ['买卖', '供应链', '对公'],
    content: `
      <h1 style="text-align: center;">产 品 采 购 合 同</h1>
      
      <p>买方（甲方）：__________ 卖方（乙方）：__________</p>
      
      <h3>一、产品信息</h3>
      <p>1. 产品名称：__________ 2. 规格型号：__________ 3. 单价：____元 4. 总价：____元。</p>
      
      <h3>二、交付与验收</h3>
      <p>1. 交付时间：____年__月__日前。</p>
      <p>2. 验收标准：按样品验收。如有质量异议，甲方应在收货后3日内书面提出。</p>
      
      <h3>三、付款方式</h3>
      <p>合同签订付30%预付款，发货前付30%，验收合格后付30%，留10%作为质保金（质保期满后无息支付）。</p>
    `
  },
  {
    id: 'biz-service',
    title: '技术服务合同',
    category: '商事合同',
    description: '软件开发、咨询服务、技术支持等场景专用。',
    tags: ['外包', '开发', '乙方'],
    content: `
      <h1 style="text-align: center;">技 术 服 务 合 同</h1>
      
      <p>委托方（甲方）：__________ 服务方（乙方）：__________</p>
      
      <h3>一、服务内容</h3>
      <p>乙方为甲方提供<span style="background-color: #fef08a">[具体项目名称]</span>的技术开发/咨询服务。</p>
      
      <h3>二、服务费用</h3>
      <p>总费用：人民币_______元。分期支付：签约付__%，验收付__%。</p>
      
      <h3>三、知识产权</h3>
      <p>履约过程中产生的代码、文档等知识产权归<span style="background-color: #fef08a">[甲方/双方共有]</span>所有。</p>
    `
  },

  // ==========================================
  // 三、 劳动人事 (Labor & HR)
  // ==========================================
  {
    id: 'labor-contract',
    title: '标准劳动合同',
    category: '劳动人事',
    description: '符合《劳动合同法》的全日制用工合同。',
    tags: ['入职', '五险一金'],
    content: `
      <h1 style="text-align: center;">劳 动 合 同 书</h1>
      <p>甲方：<span style="background-color: #fef08a">[公司名]</span> 乙方：<span style="background-color: #fef08a">[员工名]</span></p>
      <h3>一、合同期限</h3>
      <p>固定期限：自____年__月__日起至____年__月__日止。其中试用期___个月。</p>
      <h3>二、工作内容</h3>
      <p>乙方担任_______岗位，工作地点为_______。</p>
      <h3>三、劳动报酬</h3>
      <p>基本工资_______元/月，每月__日发放。</p>
    `
  },
  {
    id: 'labor-resignation',
    title: '离职证明',
    category: '劳动人事',
    description: '员工离职必备文件，证明劳动关系结束，用于办理社保转移及入职新公司。',
    tags: ['离职', '退工'],
    content: `
      <h1 style="text-align: center;">离 职 证 明</h1>
      
      <p>兹证明<span style="background-color: #fef08a">[姓名]</span>（身份证号：_____________）自____年__月__日至____年__月__日在我司担任<span style="background-color: #fef08a">[职务]</span>。</p>
      
      <p>现因<span style="background-color: #fef08a">[个人原因/协商一致]</span>，双方已于____年__月__日正式解除劳动关系。</p>
      
      <p>该员工在我司工作期间，已办理完结所有交接手续，且无任何商业纠纷。</p>
      
      <br><br>
      <p style="text-align: right;">公司名称（盖章）：_____________</p>
      <p style="text-align: right;">日期：____年__月__日</p>
    `
  },
  {
    id: 'labor-noncompete',
    title: '竞业限制协议',
    category: '劳动人事',
    description: '用于核心员工，约定离职后一定期限内不得加入竞争对手，并约定补偿金。',
    tags: ['保密', '跳槽', '赔偿'],
    content: `
      <h1 style="text-align: center;">竞 业 限 制 协 议</h1>
      
      <h3>一、竞业限制义务</h3>
      <p>乙方承诺，从离职之日起<span style="background-color: #fef08a">24个月</span>内，不得到与甲方有竞争关系的企业任职，也不得自办竞争性企业。</p>
      
      <h3>二、经济补偿</h3>
      <p>在竞业限制期内，甲方按月向乙方支付补偿金，标准为乙方离职前12个月平均工资的<span style="background-color: #fef08a">30%</span>。</p>
      
      <h3>三、违约责任</h3>
      <p>若乙方违约，应退还已收取的补偿金，并支付违约金人民币_______元。</p>
    `
  },
  {
    id: 'labor-internship',
    title: '实习协议书',
    category: '劳动人事',
    description: '适用于在校大学生实习，明确不建立劳动关系，约定实习补贴。',
    tags: ['大学生', '校招', '免责'],
    content: `
      <h1 style="text-align: center;">实 习 协 议 书</h1>
      <p>甲方（单位）：__________ 乙方（学生）：__________</p>
      <p>鉴于乙方为在校学生，双方确认建立实习关系，而非劳动关系。</p>
      <h3>一、实习期限</h3>
      <p>自____年__月__日至____年__月__日。</p>
      <h3>二、实习补贴</h3>
      <p>甲方按___元/天标准向乙方发放实习补贴，不缴纳社会保险（但购买商业意外险）。</p>
    `
  },

  // ==========================================
  // 四、 房产租赁 (Real Estate)
  // ==========================================
  {
    id: 'lease-house',
    title: '房屋租赁合同 (住宅)',
    category: '房产租赁',
    description: '标准住宅租房合同。',
    tags: ['租房', '中介'],
    content: `
      <h1 style="text-align: center;">房屋租赁合同</h1>
      <p>出租方：__________ 承租方：__________</p>
      <p>1. 房屋地址：____________________。</p>
      <p>2. 租期：____年。租金：____元/月，押一付三。</p>
      <p>3. 违约责任：中途退租需支付1个月租金作为违约金。</p>
    `
  },
  {
    id: 'lease-commercial',
    title: '商铺租赁合同',
    category: '房产租赁',
    description: '商业地产专用，包含装修免租期、业态约定、消防责任等条款。',
    tags: ['开店', '写字楼', '免租期'],
    content: `
      <h1 style="text-align: center;">商 铺 租 赁 合 同</h1>
      
      <h3>一、商铺情况</h3>
      <p>位于________的商铺，计租面积___平米。用途：<span style="background-color: #fef08a">餐饮/零售</span>。</p>
      
      <h3>二、装修免租期</h3>
      <p>甲方给予乙方___天的装修免租期，自____起至____止，免租期内免收租金，但物业费照常缴纳。</p>
      
      <h3>三、经营约定</h3>
      <p>乙方须自行办理营业执照、消防验收等手续，若因乙方原因无法办证导致不能开业，后果自负。</p>
    `
  },
  {
    id: 'real-estate-sale',
    title: '房屋买卖合同 (二手房)',
    category: '房产租赁',
    description: '二手房交易草签协议，约定定金、首付、过户时间及交房标准。',
    tags: ['买房', '过户', '定金'],
    content: `
      <h1 style="text-align: center;">房 屋 买 卖 合 同</h1>
      <p>卖方：__________ 买方：__________</p>
      <p>1. 房屋总价：人民币_______万元。</p>
      <p>2. 付款方式：定金__万，首付__万（过户当日支付），余款贷款。</p>
      <p>3. 违约责任：卖方违约不卖的，双倍返还定金。</p>
    `
  },

  // ==========================================
  // 五、 知识产权 (Intellectual Property)
  // ==========================================
  {
    id: 'ip-nda',
    title: '保密协议 (NDA)',
    category: '知识产权',
    description: '通用商业保密协议，防止商业机密泄露。',
    tags: ['机密', '泄露', '赔偿'],
    content: `
      <h1 style="text-align: center;">保 密 协 议</h1>
      <p>披露方：__________ 接收方：__________</p>
      <h3>1. 保密信息</h3>
      <p>包括但不限于技术图纸、客户名单、财务数据、经营计划等。</p>
      <h3>2. 保密义务</h3>
      <p>接收方不得向任何第三方披露，不得用于合作项目以外的用途。</p>
      <h3>3. 违约金</h3>
      <p>若违反保密义务，应支付违约金人民币_______万元。</p>
    `
  },
  {
    id: 'ip-software',
    title: '软件委托开发合同',
    category: '知识产权',
    description: '约定软件功能需求、交付节点、源代码归属及售后维护。',
    tags: ['代码', '源码', '交付'],
    content: `
      <h1 style="text-align: center;">软件委托开发合同</h1>
      <p>甲方（需求方）：__________ 乙方（开发方）：__________</p>
      <h3>1. 开发内容</h3>
      <p>乙方需按附件需求说明书开发<span style="background-color: #fef08a">[APP/网站]</span>。</p>
      <h3>2. 交付物</h3>
      <p>包含：可运行程序、源代码、数据库设计文档、操作手册。</p>
      <h3>3. 验收标准</h3>
      <p>以双方确认的需求文档为准，Bug率低于___%。</p>
    `
  },
  {
    id: 'ip-transfer',
    title: '商标转让协议',
    category: '知识产权',
    description: '用于商标权的买卖过户。',
    tags: ['商标', '品牌', '转让'],
    content: `
      <h1 style="text-align: center;">商 标 转 让 协 议</h1>
      <p>转让方：__________ 受让方：__________</p>
      <p>1. 转让标的：注册号为_______的商标。</p>
      <p>2. 转让费用：人民币_______元。</p>
      <p>3. 过户义务：转让方应配合向商标局提交转让申请。</p>
    `
  },

  // ==========================================
  // 六、 法律函件与诉讼 (Legal Letters)
  // ==========================================
  {
    id: 'biz-letter',
    title: '律师函 (催款)',
    category: '法律函件',
    description: '标准催款律师函。',
    tags: ['警告', '欠款'],
    content: `<h1>律 师 函</h1><p>...</p>`
  },
  {
    id: 'biz-termination',
    title: '解约通知书',
    category: '法律函件',
    description: '单方解除合同的法定通知文件。',
    tags: ['分手', '终止'],
    content: `
      <h1 style="text-align: center;">解 除 合 同 通 知 书</h1>
      <p>致：__________</p>
      <p>鉴于贵方在履行《___合同》时出现严重违约（具体为：_______），已致使合同目的无法实现。</p>
      <p>根据《民法典》及合同约定，我方正式通知贵方：</p>
      <p><strong>双方签订的《___合同》于本通知送达之日起解除。</strong></p>
    `
  },
  {
    id: 'legal-opinion',
    title: '法律意见书',
    category: '法律函件',
    description: '律师针对特定法律问题出具的专业分析报告。',
    tags: ['分析', '合规'],
    content: `
      <h1 style="text-align: center;">法 律 意 见 书</h1>
      <h3>一、事实背景</h3>
      <p>...</p>
      <h3>二、法律分析</h3>
      <p>...</p>
      <h3>三、结论意见</h3>
      <p>...</p>
    `
  },
  {
    id: 'civil-lawsuit',
    title: '民事起诉状',
    category: '诉讼文书',
    description: '通用民事诉讼。',
    tags: ['打官司'],
    content: `<h1>民 事 起 诉 状</h1><p>...</p>`
  },
  {
    id: 'civil-authorization',
    title: '授权委托书',
    category: '诉讼文书',
    description: '委托律师或亲属代理诉讼。',
    tags: ['代理人'],
    content: `
      <h1 style="text-align: center;">授 权 委 托 书</h1>
      <p>委托人：_______ 受托人：_______</p>
      <p>现委托受托人在我与_______纠纷一案中，作为我的诉讼代理人。</p>
      <p>代理权限：<strong>特别授权</strong>（包括代为承认、放弃、变更诉讼请求，进行和解，提起上诉，代收法律文书等）。</p>
    `
  },
  {
    id: 'civil-application-execute',
    title: '强制执行申请书',
    category: '诉讼文书',
    description: '判决生效后对方不给钱，向法院申请强制执行。',
    tags: ['老赖', '执行'],
    content: `
      <h1 style="text-align: center;">强 制 执 行 申 请 书</h1>
      <p>申请人：_______ 被执行人：_______</p>
      <h3>请求事项：</h3>
      <p>强制被执行人履行（202_）__号民事判决书确定的义务，支付款项____元及迟延履行利息。</p>
    `
  },
  {
    id: 'civil-evidence-list',
    title: '证据目录清单',
    category: '诉讼文书',
    description: '向法院提交证据时必须附带的清单表格。',
    tags: ['证据', '法庭'],
    content: `
      <h1 style="text-align: center;">证 据 目 录</h1>
      <table style="width: 100%; border-collapse: collapse; text-align: center;">
        <tr><th width="10%">序号</th><th width="30%">证据名称</th><th width="10%">页数</th><th width="50%">证明目的</th></tr>
        <tr><td>1</td><td>借条</td><td>1</td><td>证明借贷关系存在及金额。</td></tr>
        <tr><td>2</td><td>转账记录</td><td>2</td><td>证明款项已实际交付。</td></tr>
      </table>
    `
  },
  
  // ==========================================
  // 七、 其他常用 (Others)
  // ==========================================
  {
    id: 'other-receipt',
    title: '收条/收据',
    category: '其他',
    description: '收到款项或物品的凭证。',
    tags: ['凭证'],
    content: `
      <h1 style="text-align: center;">收 条</h1>
      <p>今收到 __________ 支付的 __________ 款项，共计人民币（大写）___________元整。</p>
      <p>收款方式：<span style="background-color: #fef08a">现金/转账</span>。</p>
      <p style="text-align: right;">收款人：_______ 日期：____</p>
    `
  },
  {
    id: 'other-prove',
    title: '收入证明',
    category: '其他',
    description: '用于办理信用卡、房贷等。',
    tags: ['银行', '贷款'],
    content: `
      <h1 style="text-align: center;">收 入 证 明</h1>
      <p>兹证明 _______ 系我单位员工，担任 _____ 职务。</p>
      <p>其月平均收入为人民币 _______ 元（含税）。</p>
      <p>本单位承诺上述情况属实。</p>
    `
  }
]

// ... (保留原有 LEGAL_TEMPLATES)

export const STANDARD_CLAUSES = [
  {
    title: '不可抗力条款',
    desc: '标准免责声明',
    content: '<p><strong>第X条 不可抗力</strong></p><p>1. “不可抗力”是指所有非受不可抗力影响的一方无法控制的、不可预见、不能避免并无法克服的事件，该事件妨碍、影响或延误任何一方根据本协议履行其全部或部分义务。该事件包括但不限于政府行为、自然灾害、战争、敌对行为或动乱、流行病等。</p><p>2. 出现不可抗力事件时，知情方应及时、充分地以书面形式通知对方，并告知该类事件对本协议可能产生的影响。</p>'
  },
  {
    title: '保密条款',
    desc: '严格保密约定',
    content: '<p><strong>第X条 保密义务</strong></p><p>双方确认，在签署、履行本协议过程中知悉的对方的商业秘密（包括但不限于财务数据、客户名单、技术资料等）均属于保密信息。未经对方书面同意，任何一方不得向第三方披露，也不得用于本协议以外的用途。保密期限不受本协议效力终止的影响。</p>'
  },
  {
    title: '争议解决条款',
    desc: '诉讼/仲裁管辖',
    content: '<p><strong>第X条 争议解决</strong></p><p>因履行本合同所发生的或与本合同有关的一切争议，双方应首先通过友好协商解决。协商不成的，任何一方均有权向<strong>原告住所地人民法院</strong>提起诉讼。</p>'
  },
  {
    title: '违约责任条款',
    desc: '通用赔偿规则',
    content: '<p><strong>第X条 违约责任</strong></p><p>任何一方违反本合同约定的，应赔偿因此给守约方造成的全部损失，包括但不限于直接经济损失、预期利益损失以及守约方为维权支付的律师费、诉讼费、公证费、差旅费等。</p>'
  }
]