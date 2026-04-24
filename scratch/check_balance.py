import os
import uuid
import jwt
import requests

access_key = 'qDA5qWHTAa0ih3e3dLlZ49lhZShSvflZQGlj284H'
secret_key = 'v4k5MkHXTg1eg2geRyGtUMekmeTEsMp1OywuZvQu'
server_url = 'https://api.upbit.com/v1'

payload = {
    'access_key': access_key,
    'nonce': str(uuid.uuid4())
}

jwt_token = jwt.encode(payload, secret_key)
authorization_token = 'Bearer {}'.format(jwt_token)
headers = {'Authorization': authorization_token}

try:
    res = requests.get(server_url + "/accounts", headers=headers)
    if res.status_code == 200:
        accounts = res.json()
        print("--- 계좌 보유 자산 ---")
        for act in accounts:
            currency = act['currency']
            balance = act['balance']
            avg_buy_price = act['avg_buy_price']
            print(f"{currency}: {balance} (평단가: {avg_buy_price})")
    else:
        print(f"오류: {res.status_code} {res.text}")
except Exception as e:
    print(f"오류 발생: {e}")
