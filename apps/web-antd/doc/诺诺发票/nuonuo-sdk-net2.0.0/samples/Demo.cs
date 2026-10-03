using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using NuonuoSDK;

namespace SdkTest
{
    class Program
    {
        /// <summary>
        /// 商户获取访问令牌
        /// </summary>
        /// <returns></returns>
        public string getMerchantToken()
        {
            string appKey = "";//your.appKey
            string appSecret = "your.appSecret";
            return NNOpenSDK.getMerchantToken(appKey, appSecret);
        }

        /// <summary>
        /// ISV获取访问令牌
        /// </summary>
        /// <returns></returns>
        public string getISVToken()
        {
            string code = "your.code";
            string appKey = "your.appKey";
            string appSecret = "your.appSecret";
            string taxnum = "your.taxnum";
            string redirectUri = "your.redirectUri";
            return NNOpenSDK.getISVToken(appKey, appSecret, code, taxnum, redirectUri);
        }

        /// <summary>
        /// ISV获取刷新令牌
        /// </summary>
        /// <returns></returns>
        public string refreshISVToken()
        {
            string userId = "your.userId";
            string refreshToken = "your.refreshToken";
            string appSecret = "your.appSecret";
            return NNOpenSDK.refreshISVToken(refreshToken, userId, appSecret);
        }

        /// <summary>
        /// 调用诺诺开放平台API
        /// </summary>
        /// <returns></returns>
        public string sendRequest(string url)
        {
            string appKey = "your.appKey";
            string appSecret = "your.appSecret";
            string taxnum = "your.taxnum"; // ISV下商户税号，商家应用置""即可
            string token = "your.token";
            string senid = Guid.NewGuid().ToString().Replace("-", "").Substring(0, 32); // 唯一标识，由企业自己生成32位随机码
            string method = "nuonuo.electronInvoice.CheckEInvoice";
            string content = "{" +
                    "\"invoiceSerialNum\":[\"17062615594501000004\"]" +
                    "}";
            return NNOpenSDK.sendPostSyncRequest(url, senid, appKey, appSecret, token, taxnum, method, content);
        }


        public static void Main(string[] args)
        {
            string result = "";
            string sandboxUrl = "https://sandbox.nuonuocs.cn/open/v1/services"; // 沙箱地址

            Program demo = new Program();
            try
            {
                result = demo.sendRequest(sandboxUrl);
                //result = demo.getMerchantToken();
                Console.WriteLine("返回：\n" + result);
            }
            catch (NNException e)
            {
                Console.WriteLine("返回：\n" + e.Message);
            }
            Console.ReadKey();
        }

    }
}
