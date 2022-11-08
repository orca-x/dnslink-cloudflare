const got = require("got");
const debug = require("debug")("dnslink-cloudflare");

async function getZoneId(api, name) {
  let res;

  for (
    let i = 1;
    (res = await api(`zones?page=${i}`)) &&
    res.body.result_info.total_pages >= i;
    i++
  ) {
    for (const zone of res.body.result) {
      if (zone.name === name) {
        return zone.id;
      }
    }
  }

  throw new Error(`zone ${name} couldn't be found`);
}

function getClient(apiOpts) {
  const opts = {
    prefixUrl: "https://api.cloudflare.com/client/v4",
    responseType: "json",
  };

  if (apiOpts.token) {
    opts.headers = {
      Authorization: `Bearer ${apiOpts.token}`,
    };
  } else {
    opts.headers = {
      "X-Auth-Email": apiOpts.email,
      "X-Auth-Key": apiOpts.key,
    };
  }

  return got.extend(opts);
}

async function createOrUpdate(apiOpts, { zone, link, record }) {
  const api = getClient(apiOpts);
  const id = await getZoneId(api, zone);

  const res = await api(`zones/${id}/web3/hostnames`);
  debug(`list: ${JSON.stringify(res.body, null, 2)}`);
  const results = res.body["result"];
  debug(`Found ${results.length} records on ${zone}, finding ${record}`);
  const target = results.find((r) => r.name === record);
  if (target) {
    debug(`found target: ${JSON.stringify(target)}, try updating`);
    if (target.dnslink === link) {
      return {
        result: "already set",
      };
    }
    const u_res = await api.patch(`zones/${id}/web3/hostnames/${target.id}`, {
      json: {
        dnslink: link,
      },
    });
    debug(`update result: ${JSON.stringify(u_res.body, null, 2)}`);

    const success = u_res.body["success"];
    if (!success) {
      throw new Error(`failed to update ${record} to ${link}`);
    }
    return {
      result: "updated",
    };
  } else {
    debug(`target not found, try creating`);
    const c_res = await api.post(`zones/${id}/web3/hostnames`, {
      json: {
        name: record,
        target: "ipfs",
        dnslink: link,
        destination: "ipfs created by @orca-x/dnslink-cloudflare",
      },
    });

    debug(`create with result: ${JSON.stringify(c_res.body, null, 2)}`);
    const success = c_res.body["success"];
    if (!success) {
      throw new Error(`failed to create record ${record}`);
    }

    return {
      result: "created",
    };
  }
}

module.exports = createOrUpdate;
