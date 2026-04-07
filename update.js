// Cloudflare Worker для подписки SHUR-SUB
// Ссылка: https://shur-sub.ваш-аккаунт.workers.dev/sub

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }
    
    // Роутинг: /sub или / — основная подписка
    if (url.pathname === '/sub' || url.pathname === '/') {
      // ВАШ МАССИВ КОНФИГОВ (чистый массив, каждый элемент — отдельный сервер)
      const subscription = [
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "telegram.private-networks-zk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "29532768-ea65-4f87-b913-052ae5b973ae",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "chrome",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "ads.x5.ru",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇫🇮 FREE server",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "dns": {
            "port": 53,
            "queryStrategy": "UseIPv4",
            "servers": ["8.8.4.4", "8.8.8.8"]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "http"
            }
          ],
          "meta": null,
          "outbounds": [
            {
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.mint-lance.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "0fa827e5-349f-40cc-8daf-c6952a9fa64c"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "tradingview.com",
                  "shortId": "50",
                  "show": false
                },
                "security": "reality",
                "tcpSettings": {}
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "tag": "block"
            }
          ],
          "remarks": "🇺🇸 США 🇺🇸",
          "routing": {
            "domainMatcher": "hybrid",
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "outboundTag": "block",
                "protocol": ["bittorrent"],
                "type": "field"
              },
              {
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct",
                "type": "field"
              },
              {
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct",
                "type": "field"
              }
            ]
          }
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.red-blaze.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "tradingview.com",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇳🇱 Нидерланды",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.gold-pond.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "par.eu-ffast.com",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇫🇷 Франция",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "dns": {
            "port": 53,
            "queryStrategy": "UseIPv4",
            "servers": ["8.8.4.4", "8.8.8.8"]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "http"
            }
          ],
          "meta": null,
          "outbounds": [
            {
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.wide-frost.test-cdn-kkk.com",
                    "port": 8443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "0fa827e5-349f-40cc-8daf-c6952a9fa64c"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "tradingview.com",
                  "shortId": "50",
                  "show": false
                },
                "security": "reality",
                "tcpSettings": {}
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "tag": "block"
            }
          ],
          "remarks": "🇫🇮 🎮 Игровой №1",
          "routing": {
            "domainMatcher": "hybrid",
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "outboundTag": "block",
                "protocol": ["bittorrent"],
                "type": "field"
              },
              {
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct",
                "type": "field"
              },
              {
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct",
                "type": "field"
              }
            ]
          }
        },
        {
          "dns": {
            "port": 53,
            "queryStrategy": "UseIPv4",
            "servers": ["8.8.4.4", "8.8.8.8"]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "http"
            }
          ],
          "meta": null,
          "outbounds": [
            {
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.raw-maple.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "0fa827e5-349f-40cc-8daf-c6952a9fa64c"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "tradingview.com",
                  "shortId": "50",
                  "show": false
                },
                "security": "reality",
                "tcpSettings": {}
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "tag": "block"
            }
          ],
          "remarks": "🇪🇪 🎮 Игровой №2",
          "routing": {
            "domainMatcher": "hybrid",
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "outboundTag": "block",
                "protocol": ["bittorrent"],
                "type": "field"
              },
              {
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct",
                "type": "field"
              },
              {
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct",
                "type": "field"
              }
            ]
          }
        },
        {
          "dns": {
            "port": 53,
            "queryStrategy": "UseIPv4",
            "servers": ["8.8.4.4", "8.8.8.8"]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true,
                "routeOnly": false
              },
              "tag": "http"
            }
          ],
          "meta": null,
          "outbounds": [
            {
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.vast-mesa.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "0fa827e5-349f-40cc-8daf-c6952a9fa64c"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "tradingview.com",
                  "shortId": "50",
                  "show": false
                },
                "security": "reality",
                "tcpSettings": {}
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "tag": "block"
            }
          ],
          "remarks": "🇸🇪 🎮 Игровой №3",
          "routing": {
            "domainMatcher": "hybrid",
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "outboundTag": "block",
                "protocol": ["bittorrent"],
                "type": "field"
              },
              {
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct",
                "type": "field"
              },
              {
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct",
                "type": "field"
              }
            ]
          }
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.grey-lance.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "tradingview.com",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇩🇪 Германия",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.iron-coral.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "tradingview.com",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇷🇺 Россия",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "remarks": "Telegram №1🇷🇺",
          "dns": {
            "servers": [
              "https://1.1.1.1/dns-query",
              "https://dns.google/dns-query",
              "https://dns.quad9.net/dns-query"
            ],
            "queryStrategy": "UseIPv4"
          },
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "type": "field",
                "protocol": ["bittorrent"],
                "outboundTag": "block"
              },
              {
                "type": "field",
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "domain": [
                  "domain:telegram.org",
                  "domain:t.me",
                  "domain:tdesktop.com",
                  "domain:usercontent.telegram.org"
                ],
                "outboundTag": "proxy"
              },
              {
                "type": "field",
                "ip": [
                  "91.108.4.0/22",
                  "91.108.8.0/22",
                  "91.108.12.0/22",
                  "91.108.16.0/22",
                  "91.108.20.0/22",
                  "95.161.64.0/20",
                  "149.154.160.0/20"
                ],
                "outboundTag": "proxy"
              }
            ]
          },
          "inbounds": [
            {
              "tag": "socks",
              "port": 10808,
              "listen": "127.0.0.1",
              "protocol": "socks",
              "settings": {
                "udp": true,
                "auth": "noauth"
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            },
            {
              "tag": "http",
              "port": 10809,
              "listen": "127.0.0.1",
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            }
          ],
          "outbounds": [
            {
              "tag": "proxy",
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.iron-coral.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "id": "5ae46adf-322d-4e8a-8c28-3f71ce56cd9d",
                        "encryption": "none",
                        "flow": "xtls-rprx-vision"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": true,
                  "tcpKeepAliveIdle": 300,
                  "tcpKeepAliveInterval": 30
                },
                "security": "reality",
                "realitySettings": {
                  "serverName": "tradingview.com",
                  "fingerprint": "firefox",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "shortId": "50",
                  "show": false
                }
              },
              "mux": {
                "enabled": true,
                "concurrency": 4
              }
            },
            {
              "tag": "direct",
              "protocol": "freedom",
              "streamSettings": {
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": true
                }
              }
            },
            {
              "tag": "block",
              "protocol": "blackhole"
            }
          ]
        },
        {
          "remarks": "Telegram №2🇷🇺",
          "dns": {
            "servers": [
              "https://1.1.1.1/dns-query",
              "https://dns.google/dns-query",
              "https://dns.quad9.net/dns-query"
            ],
            "queryStrategy": "UseIPv4"
          },
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "type": "field",
                "protocol": ["bittorrent"],
                "outboundTag": "block"
              },
              {
                "type": "field",
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "domain": [
                  "domain:telegram.org",
                  "domain:t.me",
                  "domain:tdesktop.com",
                  "domain:usercontent.telegram.org"
                ],
                "outboundTag": "proxy"
              },
              {
                "type": "field",
                "ip": [
                  "91.108.4.0/22",
                  "91.108.8.0/22",
                  "91.108.12.0/22",
                  "91.108.16.0/22",
                  "91.108.20.0/22",
                  "95.161.64.0/20",
                  "149.154.160.0/20"
                ],
                "outboundTag": "proxy"
              }
            ]
          },
          "inbounds": [
            {
              "tag": "socks",
              "port": 10808,
              "listen": "127.0.0.1",
              "protocol": "socks",
              "settings": {
                "udp": true,
                "auth": "noauth"
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            },
            {
              "tag": "http",
              "port": 10809,
              "listen": "127.0.0.1",
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            }
          ],
          "outbounds": [
            {
              "tag": "proxy",
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.iron-coral.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "id": "5ae46adf-322d-4e8a-8c28-3f71ce56cd9d",
                        "encryption": "none",
                        "flow": "xtls-rprx-vision"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": true
                },
                "security": "reality",
                "realitySettings": {
                  "serverName": "tradingview.com",
                  "fingerprint": "firefox",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "shortId": "50",
                  "show": false
                }
              }
            },
            {
              "tag": "direct",
              "protocol": "freedom",
              "streamSettings": {
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": true
                }
              }
            },
            {
              "tag": "block",
              "protocol": "blackhole"
            }
          ]
        },
        {
          "remarks": "🇷🇺LTE + Telegram №2",
          "dns": {
            "servers": [
              "https://1.1.1.1/dns-query",
              "https://dns.google/dns-query",
              "1.1.1.1"
            ],
            "queryStrategy": "UseIPv4"
          },
          "inbounds": [
            {
              "tag": "socks",
              "port": 10808,
              "listen": "127.0.0.1",
              "protocol": "socks",
              "settings": {
                "udp": true,
                "auth": "noauth"
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            },
            {
              "tag": "http",
              "port": 10809,
              "listen": "127.0.0.1",
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            }
          ],
          "observatory": {
            "enableConcurrency": true,
            "probeInterval": "1m",
            "probeUrl": "https://www.google.com/generate_204",
            "subjectSelector": [
              "grp-29-1-q0jhnp37dks",
              "grp-29-2-tkf6ndsbta8"
            ]
          },
          "outbounds": [
            {
              "tag": "grp-29-1-q0jhnp37dks",
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.grey-lance.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "id": "5ae46adf-322d-4e8a-8c28-3f71ce56cd9d",
                        "encryption": "none",
                        "flow": "xtls-rprx-vision"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": false,
                  "tcpKeepAliveIdle": 60,
                  "tcpKeepAliveInterval": 15
                },
                "security": "reality",
                "realitySettings": {
                  "serverName": "tradingview.com",
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "shortId": "50",
                  "show": false
                }
              },
              "mux": {
                "enabled": false
              }
            },
            {
              "tag": "grp-29-2-tkf6ndsbta8",
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.pale-moose.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "id": "5ae46adf-322d-4e8a-8c28-3f71ce56cd9d",
                        "encryption": "none",
                        "flow": "xtls-rprx-vision"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": false,
                  "tcpKeepAliveIdle": 60,
                  "tcpKeepAliveInterval": 15
                },
                "security": "reality",
                "realitySettings": {
                  "serverName": "sun6-21.userapi.com",
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "shortId": "50",
                  "show": false
                }
              },
              "mux": {
                "enabled": false
              }
            },
            {
              "tag": "direct",
              "protocol": "freedom",
              "streamSettings": {
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": false
                }
              }
            },
            {
              "tag": "block",
              "protocol": "blackhole"
            }
          ],
          "routing": {
            "domainMatcher": "hybrid",
            "domainStrategy": "IPIfNonMatch",
            "balancers": [
              {
                "tag": "bal_29",
                "selector": ["grp-29-1-q0jhnp37dks"],
                "fallbackTag": "grp-29-2-tkf6ndsbta8",
                "strategy": {
                  "type": "leastLoad",
                  "settings": {
                    "baselines": ["4s"],
                    "costs": [
                      {
                        "match": "grp-29-1-q0jhnp37dks",
                        "regexp": false,
                        "value": 1
                      },
                      {
                        "match": "grp-29-2-tkf6ndsbta8",
                        "regexp": false,
                        "value": 1000000
                      }
                    ],
                    "expected": 1,
                    "maxRTT": "6s"
                  }
                }
              }
            ],
            "rules": [
              {
                "type": "field",
                "protocol": ["bittorrent"],
                "outboundTag": "block"
              },
              {
                "type": "field",
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "inboundTag": ["socks", "http"],
                "network": "tcp,udp",
                "balancerTag": "bal_29"
              }
            ]
          }
        },
        {
          "remarks": "🇷🇺LTE + Telegram №1",
          "dns": {
            "servers": [
              "https://1.1.1.1/dns-query",
              "https://dns.google/dns-query",
              "1.1.1.1"
            ],
            "queryStrategy": "UseIPv4"
          },
          "inbounds": [
            {
              "tag": "socks",
              "port": 10808,
              "listen": "127.0.0.1",
              "protocol": "socks",
              "settings": {
                "udp": true,
                "auth": "noauth"
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            },
            {
              "tag": "http",
              "port": 10809,
              "listen": "127.0.0.1",
              "protocol": "http",
              "settings": {
                "allowTransparent": false
              },
              "sniffing": {
                "enabled": true,
                "destOverride": ["http", "tls", "quic"]
              }
            }
          ],
          "observatory": {
            "enableConcurrency": true,
            "probeInterval": "1m",
            "probeUrl": "https://www.google.com/generate_204",
            "subjectSelector": [
              "grp-29-1-q0jhnp37dks",
              "grp-29-2-tkf6ndsbta8"
            ]
          },
          "outbounds": [
            {
              "tag": "grp-29-1-q0jhnp37dks",
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.grey-lance.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "id": "5ae46adf-322d-4e8a-8c28-3f71ce56cd9d",
                        "encryption": "none",
                        "flow": "xtls-rprx-vision"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": true,
                  "tcpKeepAliveIdle": 300,
                  "tcpKeepAliveInterval": 30
                },
                "security": "reality",
                "realitySettings": {
                  "serverName": "tradingview.com",
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "shortId": "50",
                  "show": false
                }
              },
              "mux": {
                "enabled": true,
                "concurrency": 4
              }
            },
            {
              "tag": "grp-29-2-tkf6ndsbta8",
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.pale-moose.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "id": "5ae46adf-322d-4e8a-8c28-3f71ce56cd9d",
                        "encryption": "none",
                        "flow": "xtls-rprx-vision"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": true,
                  "tcpKeepAliveIdle": 300,
                  "tcpKeepAliveInterval": 30
                },
                "security": "reality",
                "realitySettings": {
                  "serverName": "sun6-21.userapi.com",
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "shortId": "50",
                  "show": false
                }
              },
              "mux": {
                "enabled": true,
                "concurrency": 4
              }
            },
            {
              "tag": "direct",
              "protocol": "freedom",
              "streamSettings": {
                "sockopt": {
                  "tcpNoDelay": true,
                  "tcpFastOpen": true
                }
              }
            },
            {
              "tag": "block",
              "protocol": "blackhole"
            }
          ],
          "routing": {
            "domainMatcher": "hybrid",
            "domainStrategy": "IPIfNonMatch",
            "balancers": [
              {
                "tag": "bal_29",
                "selector": ["grp-29-1-q0jhnp37dks"],
                "fallbackTag": "grp-29-2-tkf6ndsbta8",
                "strategy": {
                  "type": "leastLoad",
                  "settings": {
                    "baselines": ["4s"],
                    "costs": [
                      {
                        "match": "grp-29-1-q0jhnp37dks",
                        "regexp": false,
                        "value": 1
                      },
                      {
                        "match": "grp-29-2-tkf6ndsbta8",
                        "regexp": false,
                        "value": 1000000
                      }
                    ],
                    "expected": 1,
                    "maxRTT": "6s"
                  }
                }
              }
            ],
            "rules": [
              {
                "type": "field",
                "protocol": ["bittorrent"],
                "outboundTag": "block"
              },
              {
                "type": "field",
                "domain": [
                  "domain:mtalk.google.com",
                  "domain:push.apple.com",
                  "domain:api.push.apple.com",
                  "domain:push-apple.com.akadns.net",
                  "domain:*-courier.push.apple.com"
                ],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "ip": ["17.0.0.0/8"],
                "outboundTag": "direct"
              },
              {
                "type": "field",
                "inboundTag": ["socks", "http"],
                "network": "tcp,udp",
                "balancerTag": "bal_29"
              }
            ]
          }
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.pale-moose.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "sun6-21.userapi.com",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇫🇮 LTE №1",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.fast-helm.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "sun6-21.userapi.com",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇫🇮 LTE №2",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.dry-moose.test-cdn-kkk.com",
                    "port": 443,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "ads.x5.ru",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇫🇮 LTE №10",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        },
        {
          "dns": {
            "hosts": {
              "77.88.8.8": "77.88.8.8",
              "dns.quad9.net": "9.9.9.9",
              "lkfl2.nalog.ru": "213.24.64.175",
              "lknpd.nalog.ru": "213.24.64.181"
            },
            "queryStrategy": "UseIPv4",
            "servers": [
              "https://dns.quad9.net/dns-query",
              {
                "address": "https://dns.quad9.net/dns-query",
                "domains": [
                  "geosite:github",
                  "geosite:twitch-ads",
                  "geosite:youtube",
                  "geosite:telegram"
                ]
              },
              {
                "address": "https://77.88.8.8/dns-query",
                "domains": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ]
              }
            ]
          },
          "inbounds": [
            {
              "listen": "127.0.0.1",
              "port": 10808,
              "protocol": "socks",
              "settings": {
                "auth": "noauth",
                "udp": true,
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "socks"
            },
            {
              "listen": "127.0.0.1",
              "port": 10809,
              "protocol": "http",
              "settings": {
                "userLevel": 8
              },
              "sniffing": {
                "destOverride": ["http", "tls", "quic"],
                "enabled": true
              },
              "tag": "http"
            },
            {
              "listen": "127.0.0.1",
              "port": 11111,
              "protocol": "dokodemo-door",
              "settings": {
                "address": "127.0.0.1"
              },
              "tag": "metrics_in"
            }
          ],
          "log": {
            "loglevel": "warning"
          },
          "metrics": {
            "tag": "metrics_out"
          },
          "outbounds": [
            {
              "mux": {
                "concurrency": -1,
                "enabled": false,
                "xudpConcurrency": 8,
                "xudpProxyUDP443": ""
              },
              "protocol": "vless",
              "settings": {
                "vnext": [
                  {
                    "address": "test.fast-blade.test-cdn-kkk.com",
                    "port": 10167,
                    "users": [
                      {
                        "encryption": "none",
                        "flow": "xtls-rprx-vision",
                        "id": "cafce808-a7c4-4b83-85e6-8f13f64b88b8",
                        "level": 8,
                        "security": "auto"
                      }
                    ]
                  }
                ]
              },
              "streamSettings": {
                "network": "tcp",
                "realitySettings": {
                  "allowInsecure": false,
                  "fingerprint": "qq",
                  "publicKey": "-tePObR3oZwGAUOb5kqTYkNWl6rtUKl0RFuzuu06wgw",
                  "serverName": "eh.vk.com",
                  "shortId": "50",
                  "show": false,
                  "spiderX": "/"
                },
                "security": "reality",
                "tcpSettings": {
                  "header": {
                    "type": "none"
                  }
                }
              },
              "tag": "proxy"
            },
            {
              "protocol": "freedom",
              "settings": {
                "domainStrategy": "UseIP"
              },
              "tag": "direct"
            },
            {
              "protocol": "blackhole",
              "settings": {
                "response": {
                  "type": "http"
                }
              },
              "tag": "block"
            }
          ],
          "policy": {
            "levels": {
              "0": {
                "statsUserDownlink": true,
                "statsUserUplink": true
              },
              "8": {
                "connIdle": 300,
                "downlinkOnly": 1,
                "handshake": 4,
                "uplinkOnly": 1
              }
            },
            "system": {
              "statsInboundDownlink": true,
              "statsInboundUplink": true,
              "statsOutboundDownlink": true,
              "statsOutboundUplink": true
            }
          },
          "remarks": "🇫🇮 LTE №3",
          "routing": {
            "domainStrategy": "IPIfNonMatch",
            "rules": [
              {
                "ip": ["9.9.9.9"],
                "outboundTag": "proxy",
                "port": 443
              },
              {
                "ip": ["77.88.8.8"],
                "outboundTag": "direct",
                "port": 443
              },
              {
                "inboundTag": ["metrics_in"],
                "outboundTag": "metrics_out"
              },
              {
                "domain": ["geosite:win-spy", "geosite:torrent", "geosite:category-ads"],
                "outboundTag": "block"
              },
              {
                "domain": ["geosite:github", "geosite:twitch-ads", "geosite:youtube", "geosite:telegram"],
                "outboundTag": "proxy"
              },
              {
                "domain": [
                  "geosite:private",
                  "geosite:category-ru",
                  "geosite:whitelist",
                  "geosite:microsoft",
                  "geosite:apple",
                  "geosite:google-play",
                  "geosite:epicgames",
                  "geosite:riot",
                  "geosite:escapefromtarkov",
                  "geosite:steam",
                  "geosite:origin",
                  "geosite:twitch",
                  "geosite:pinterest",
                  "geosite:faceit"
                ],
                "outboundTag": "direct"
              },
              {
                "ip": ["geoip:private", "geoip:direct"],
                "outboundTag": "direct"
              }
            ]
          },
          "stats": {}
        }
      ];
      
      const expireDate = new Date();
      expireDate.setFullYear(expireDate.getFullYear() + 1);
      const expireTimestamp = Math.floor(expireDate.getTime() / 1000);
      const userinfo = `upload=0; download=0; total=0; expire=${expireTimestamp}`;
      const profileTitle = 'SHUR-SUB NODE';
      
      // КЭШИРОВАНИЕ: сохраняем ответ на 12 часов
      // Cloudflare будет отдавать закэшированную версию без вызова Worker
      const response = new Response(JSON.stringify(subscription, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=43200, s-maxage=43200',  // кэш 12 часов
          'CDN-Cache-Control': 'public, max-age=43200',               // для Cloudflare CDN
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Profile-Update-Interval': '12',
          'Profile-Title': profileTitle,
          'Subscription-Userinfo': userinfo
        }
      });
      
      // Cloudflare Edge TTL (кэширование на периферии)
      ctx.waitUntil(
        fetch(request, {
          cf: { cacheTtl: 43200 }  // 12 часов в секундах
        })
      );
      
      return response;
    }
    
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    return new Response('Not found', { status: 404 });
  }
};
