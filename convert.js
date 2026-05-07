/*!
 * 源文件 https://github.com/powerfullz/override-rules
 *
 * - loadbalance: 启用负载均衡（url-test/load-balance，默认 false）
 * - ipv6: 启用 IPv6 支持（默认 false）
 * - quic: 允许 QUIC 流量（UDP 443，默认 false）
*/

const NODE_SUFFIX = "节点";

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

function parseString(value, defaultValue = "") {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || defaultValue;
  }
  return defaultValue;
}

/**
 * 解析传入的脚本参数，并将其转换为内部使用的功能开关（feature flags）。
 * @param {object} args - 传入的原始参数对象，如 $arguments。
 * @returns {object} - 包含所有功能开关状态的对象。
 *
 * 该函数通过一个 `spec` 对象定义了外部参数名（如 `loadbalance`）到内部变量名（如 `loadBalance`）的映射关系。
 * 它会遍历 `spec` 中的每一项，对 `args` 对象中对应的参数值调用 `parseBool` 函数进行布尔化处理，
 * 并将结果存入返回的对象中。
 */
function buildFeatureFlags(args) {
  const spec = {
    loadbalance: "loadBalance",
    ipv6: "ipv6Enabled",
    quic: "quicEnabled",
  };

  const flags = Object.entries(spec).reduce((acc, [sourceKey, targetKey]) => {
    acc[targetKey] = parseBool(args[sourceKey]) || false;
    return acc;
  }, {});

  return flags;
}

const rawArgs = typeof $arguments !== "undefined" ? $arguments : {};
const {
  loadBalance,
  ipv6Enabled,
  quicEnabled,
} = buildFeatureFlags(rawArgs);

function getCountryGroupNames(countryInfo, minCount = 0) {
  const filtered = countryInfo.filter((item) => item.nodes.length >= minCount);

  filtered.sort((a, b) => {
    const wa = countriesMeta[a.country]?.weight ?? Infinity;
    const wb = countriesMeta[b.country]?.weight ?? Infinity;
    return wa - wb;
  });

  return filtered.map((item) => item.country + NODE_SUFFIX);
}

function stripNodeSuffix(groupNames) {
  const suffixPattern = new RegExp(`${NODE_SUFFIX}$`);
  return groupNames.map((name) => name.replace(suffixPattern, ""));
}

const PROXY_GROUPS = {
  SELECT: "选择代理",
  SELF: "自建节点",
  MANUAL: "手动选择",
  DIRECT: "直连",
};

function buildBaseLists({ countryGroupNames, hasSelfProxyGroup, hasManualProxyGroup }) {
  const buildList = (...elements) => elements.flat().filter(Boolean);

  /**
   * "选择代理"组的顶层候选列表：自建节点 -> 各国家组 -> 手动 -> 直连。
   */
  const defaultSelector = buildList(
    hasSelfProxyGroup && PROXY_GROUPS.SELF,
    countryGroupNames,
    hasManualProxyGroup && PROXY_GROUPS.MANUAL,
    PROXY_GROUPS.DIRECT
  );

  /**
   * 大多数策略组的通用候选列表：选择代理 → 各国家组 → 手动 → 直连。
   */
  const defaultProxies = buildList(
    PROXY_GROUPS.SELECT,
    countryGroupNames,
    hasManualProxyGroup && PROXY_GROUPS.MANUAL,
    PROXY_GROUPS.DIRECT
  );

  return { defaultProxies, defaultSelector };
}

const FEATURE_GROUP_TEMPLATES = [
  {
    name: "静态资源",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Cloudflare.png",
  },
  {
    name: "AI",
    icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/chatgpt.png",
  },
  {
    name: "Google",
    icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/Google.png",
  },
  {
    name: "YouTube",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/YouTube.png",
  },
  {
    name: "Microsoft",
    icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/Microsoft_Copilot.png",
  },
  {
    name: "Netflix",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Netflix.png",
  },
  {
    name: "Spotify",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Spotify.png",
  },
  {
    name: "Telegram",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Telegram.png",
  },
  {
    name: "OneDrive",
    icon: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/icons/Onedrive.png",
  },
  {
    name: "SSH(22端口)",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Server.png",
  },
];

const RULE_PROVIDERS = {
  ADBlock: {
    type: "http",
    behavior: "domain",
    format: "mrs",
    interval: 86400,
    url: "https://adrules.top/adrules-mihomo.mrs",
    path: "./ruleset/ADBlock.mrs",
  },
  StaticResources: {
    type: "http",
    behavior: "domain",
    format: "text",
    interval: 86400,
    url: "https://ruleset.skk.moe/Clash/domainset/cdn.txt",
    path: "./ruleset/StaticResources.txt",
  },
  CDNResources: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://ruleset.skk.moe/Clash/non_ip/cdn.txt",
    path: "./ruleset/CDNResources.txt",
  },
  SteamFix: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/SteamFix.list",
    path: "./ruleset/SteamFix.list",
  },
  GoogleFCM: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/FirebaseCloudMessaging.list",
    path: "./ruleset/FirebaseCloudMessaging.list",
  },
  AdditionalFilter: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/AdditionalFilter.list",
    path: "./ruleset/AdditionalFilter.list",
  },
  AdditionalCDNResources: {
    type: "http",
    behavior: "classical",
    format: "text",
    interval: 86400,
    url: "https://gcore.jsdelivr.net/gh/powerfullz/override-rules@master/ruleset/AdditionalCDNResources.list",
    path: "./ruleset/AdditionalCDNResources.list",
  },
};

const BASE_RULES = [
  `RULE-SET,ADBlock,广告拦截`,
  `RULE-SET,AdditionalFilter,广告拦截`,
  `RULE-SET,StaticResources,静态资源`,
  `RULE-SET,CDNResources,静态资源`,
  `RULE-SET,AdditionalCDNResources,静态资源`,
  `RULE-SET,SteamFix,${PROXY_GROUPS.DIRECT}`,
  `RULE-SET,GoogleFCM,${PROXY_GROUPS.DIRECT}`,
  `DOMAIN,services.googleapis.cn,${PROXY_GROUPS.SELECT}`,
  "GEOSITE,ONEDRIVE,OneDrive",
  "GEOSITE,MICROSOFT,Microsoft",
  "GEOSITE,TELEGRAM,Telegram",
  "GEOSITE,YOUTUBE,YouTube",
  "GEOSITE,GOOGLE,Google",
  "GEOSITE,NETFLIX,Netflix",
  "GEOSITE,SPOTIFY,Spotify",
  `GEOSITE,GFW,${PROXY_GROUPS.SELECT}`,
  `GEOSITE,CN,${PROXY_GROUPS.DIRECT}`,
  `GEOSITE,PRIVATE,${PROXY_GROUPS.DIRECT}`,
  "GEOIP,NETFLIX,Netflix,no-resolve",
  "GEOIP,TELEGRAM,Telegram,no-resolve",
  `GEOIP,CN,${PROXY_GROUPS.DIRECT}`,
  `GEOIP,PRIVATE,${PROXY_GROUPS.DIRECT}`,
  "DST-PORT,22,SSH(22端口)",
  `MATCH,${PROXY_GROUPS.SELECT}`,
];

function buildRules({ quicEnabled }) {
  const ruleList = [...BASE_RULES];

  if (!quicEnabled) {
    /**
     * 屏蔽 UDP 443（QUIC）流量。
     * 部分网络环境下 UDP 性能不稳定，禁用 QUIC 可强制回退到 TCP，改善整体体验。
     */
    ruleList.unshift("AND,((DST-PORT,443),(NETWORK,UDP)),REJECT");
  }

  return ruleList;
}

const snifferConfig = {
  "enable": true,
  "override-destination": true,
  "force-dns-mapping": true,
  sniff: {
    TLS: {
      ports: [443, 8443],
    },
    HTTP: {
      ports: [80, 8080, 8880],
    },
    QUIC: {
      ports: [443, 8443],
    },
  }
};

function buildDnsConfig({ ipv6Enabled }) {
  const config = {
    "enable": true,
    "ipv6": ipv6Enabled,
    "prefer-h3": false,
    "enhanced-mode": "fake-ip",
    "default-nameserver": ["119.29.29.29", "223.5.5.5"],
    "nameserver": ["system", "223.5.5.5", "119.29.29.29", "180.184.1.1"],
    "fallback": [
      "quic://dns0.eu",
      "https://dns.cloudflare.com/dns-query",
      "https://dns.sb/dns-query",
      "tcp://208.67.222.222",
      "tcp://8.26.56.2",
    ],
    "proxy-server-nameserver": ["https://dns.alidns.com/dns-query", "tls://dot.pub"],
    "fake-ip-filter": [
      "geosite:private",
      "geosite:connectivity-check",
      "geosite:cn",
      "*.icloud.com",
      "*.stun.*.*",
      "*.stun.*.*.*",
    ],
  };

  return config;
}

function buildManualProxyNames(proxies) {
  return proxies
    .map((proxy) => proxy.name)
    .filter((name) => name && !/^self-tts/.test(name));
}

function buildSelfProxyGroup(config, { hasManualProxyGroup = true } = {}) {
  const proxies = config.proxies || [];
  const nodes = proxies
    .map((proxy) => proxy.name || "")
    .filter((name) => /^self-tts/.test(name))
    .sort((a, b) => Number(!/main/i.test(a)) - Number(!/main/i.test(b)));

  if (nodes.length === 0) {
    return null;
  }

  return {
    name: PROXY_GROUPS.SELF,
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Bypass.png",
    type: "select",
    proxies: [
      ...nodes,
      hasManualProxyGroup && PROXY_GROUPS.MANUAL,
      PROXY_GROUPS.DIRECT,
    ].filter(Boolean),
  };
}

/**
 * 各地区的元数据：
 * `weight` 决定在代理组列表中的排列顺序（值越小越靠前，未设置则排末尾）
 * `pattern` 是用于匹配节点名称的正则字符串
 * `icon` 为策略组图标 URL
 */
const countriesMeta = {
  香港: {
    weight: 10,
    pattern: "香港|港|HK|hk|Hong Kong|HongKong|hongkong|🇭🇰",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png",
  },
  澳门: {
    pattern: "澳门|MO|Macau|🇲🇴",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Macao.png",
  },
  台湾: {
    weight: 20,
    pattern: "台|新北|彰化|TW|Taiwan|🇹🇼",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png",
  },
  新加坡: {
    weight: 30,
    pattern: "新加坡|坡|狮城|SG|Singapore|🇸🇬",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Singapore.png",
  },
  日本: {
    weight: 40,
    pattern: "日本|川日|东京|大阪|泉日|埼玉|沪日|深日|JP|Japan|🇯🇵",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png",
  },
  韩国: {
    pattern: "KR|Korea|KOR|首尔|韩|韓|🇰🇷",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Korea.png",
  },
  美国: {
    weight: 50,
    pattern: "美国|美|US|United States|🇺🇸",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png",
  },
  加拿大: {
    pattern: "加拿大|Canada|CA|🇨🇦",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Canada.png",
  },
  英国: {
    weight: 60,
    pattern: "英国|United Kingdom|UK|伦敦|London|🇬🇧",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_Kingdom.png",
  },
  澳大利亚: {
    pattern: "澳洲|澳大利亚|AU|Australia|🇦🇺",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Australia.png",
  },
  德国: {
    weight: 70,
    pattern: "德国|德|DE|Germany|🇩🇪",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Germany.png",
  },
  法国: {
    weight: 80,
    pattern: "法国|法|FR|France|🇫🇷",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/France.png",
  },
  俄罗斯: {
    pattern: "俄罗斯|俄|RU|Russia|🇷🇺",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Russia.png",
  },
  泰国: {
    pattern: "泰国|泰|TH|Thailand|🇹🇭",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Thailand.png",
  },
  印度: {
    pattern: "印度|IN|India|🇮🇳",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/India.png",
  },
  马来西亚: {
    pattern: "马来西亚|马来|MY|Malaysia|🇲🇾",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Malaysia.png",
  },
};

const countryMatchers = Object.entries(countriesMeta).map(([country, meta]) => ({
  country,
  regex: new RegExp(meta.pattern.replace(/^\(\?i\)/, ""), "i"),
}));

function parseCountries(config) {
  const proxies = config.proxies || [];
  const countryNodes = new Map();

  for (const proxy of proxies) {
    const name = proxy.name || "";
    if (/^self-tts/.test(name)) continue;
    for (const { country, regex } of countryMatchers) {
      if (regex.test(name)) {
        if (!countryNodes.has(country)) countryNodes.set(country, []);
        countryNodes.get(country).push(name);
        break;
      }
    }
  }

  return Array.from(countryNodes, ([country, nodes]) => ({ country, nodes }));
}

function buildCountryProxyGroups({ countries, loadBalance, countryInfo }) {
  const groups = [];
  const groupType = loadBalance ? "load-balance" : "url-test";
  const nodesByCountry = Object.fromEntries(countryInfo.map((item) => [item.country, item.nodes]));

  for (const country of countries) {
    const meta = countriesMeta[country];
    if (!meta) continue;

    const nodeNames = nodesByCountry[country] || [];
    const groupConfig = {
      name: `${country}${NODE_SUFFIX}`,
      icon: meta.icon,
      type: groupType,
      proxies: nodeNames,
    };

    if (!loadBalance) {
      Object.assign(groupConfig, {
        url: "https://cp.cloudflare.com/generate_204",
        interval: 60,
        tolerance: 20,
        lazy: false,
      });
    }

    groups.push(groupConfig);
  }

  return groups;
}

function buildProxyGroups({ manualProxyNames, selfProxyGroup, countryProxyGroups, defaultProxies, defaultSelector }) {
  const featureGroups = FEATURE_GROUP_TEMPLATES.map((template) => ({
    name: template.name,
    icon: template.icon,
    type: "select",
    proxies: defaultProxies,
  }));

  return [
    {
      name: PROXY_GROUPS.SELECT,
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Proxy.png",
      type: "select",
      proxies: defaultSelector,
    },
    selfProxyGroup,
    {
      name: PROXY_GROUPS.MANUAL,
      icon: "https://gcore.jsdelivr.net/gh/shindgewongxj/WHATSINStash@master/icon/select.png",
      type: "select",
      proxies: manualProxyNames,
    },
    ...featureGroups,
    {
      name: PROXY_GROUPS.DIRECT,
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Direct.png",
      type: "select",
      proxies: ["DIRECT"],
    },
    {
      name: "广告拦截",
      icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AdBlack.png",
      type: "select",
      proxies: ["REJECT", "REJECT-DROP", PROXY_GROUPS.DIRECT],
    },
    ...countryProxyGroups,
  ].filter((group) => (
    group && (group.name !== PROXY_GROUPS.MANUAL || manualProxyNames.length > 0)
  ));
}

function main(config) {
  const proxies = config && Array.isArray(config.proxies) ? config.proxies : [];
  const resultConfig = { proxies };
  const manualProxyNames = buildManualProxyNames(proxies);
  const hasManualProxyGroup = manualProxyNames.length > 0;

  const selfProxyGroup = buildSelfProxyGroup(resultConfig, { hasManualProxyGroup });

  const countryInfo = parseCountries(resultConfig);
  const countryGroupNames = getCountryGroupNames(countryInfo);
  const countries = stripNodeSuffix(countryGroupNames);

  const { defaultProxies, defaultSelector } = buildBaseLists({
    countryGroupNames,
    hasSelfProxyGroup: Boolean(selfProxyGroup),
    hasManualProxyGroup,
  });

  const countryProxyGroups = buildCountryProxyGroups({
    countries,
    loadBalance,
    countryInfo,
  });

  const proxyGroups = buildProxyGroups({
    manualProxyNames,
    selfProxyGroup,
    countryProxyGroups,
    defaultProxies,
    defaultSelector,
  });

  const globalProxies = proxyGroups.map((item) => item.name);
  proxyGroups.push({
    name: "GLOBAL",
    icon: "https://gcore.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Global.png",
    "include-all": true,
    type: "select",
    proxies: globalProxies,
  });

  const finalRules = buildRules({ quicEnabled });
  const dnsConfig = buildDnsConfig({ ipv6Enabled });

  Object.assign(resultConfig, {
    "proxy-groups": proxyGroups,
    "rule-providers": RULE_PROVIDERS,
    "rules": finalRules,
    "sniffer": snifferConfig,
    "dns": dnsConfig,
    "geodata-mode": true,
    "geox-url": {
      "geoip": "https://gcore.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat",
      "geosite": "https://gcore.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat",
      "mmdb": "https://gcore.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb",
      "asn": "https://gcore.jsdelivr.net/gh/Loyalsoldier/geoip@release/GeoLite2-ASN.mmdb",
    },
  });

  return resultConfig;
}
