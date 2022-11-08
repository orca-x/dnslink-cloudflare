#!/usr/bin/env node

const meow = require("meow");
const createOrUpdate = require("../lib");

const cli = meow(
  `
    Updates the dnslink for a Cloudflare configuration. Both the CF_API_KEY and CF_API_EMAIL environment
    variables or the CF_API_TOKEN environment variable must be set.
  
    Usage
      $ dnslink-cloudflare -d <domain> -l <link> [-r record]
 
    Options
      --domain, -d      Cloudflare domain name
      --link, -k        dnslink value, eg. ipfs path
      --record, -r      Domain record name
`,
  {
    flags: {
      domain: {
        type: "string",
        alias: "d",
        isRequired: true,
      },
      link: {
        type: "string",
        alias: "l",
        isRequired: true,
      },
      record: {
        alias: "r",
        type: "string",
        default: "@",
      },
    },
  }
);

async function run() {
  const key = process.env.CF_API_KEY;
  const email = process.env.CF_API_EMAIL;
  const token = process.env.CF_API_TOKEN;

  if ((!key || !email) && !token) {
    cli.showHelp();
    return;
  }

  const api = {
    key,
    email,
    token,
  };

  const opts = {
    record:
      cli.flags.record === "@"
        ? cli.flags.domain
        : `${cli.flags.record}.${cli.flags.domain}`,
    zone: cli.flags.domain,
    link: cli.flags.link,
  };

  try {
    console.log(`Updating ${opts.record} to ${opts.link}, zone: ${opts.zone}`);
    const result = await createOrUpdate(api, opts);
    console.log(
      `dnslink-cloudflare: success set ${opts.record} to ${opts.link}, result: ${result.result}`
    );
  } catch (err) {
    console.log(
      `dnslink-cloudflare: failed to set link ${opts.record} to ${opts.link}, error: ${err.message}`
    );
    process.exit(1);
  }
}

run();
