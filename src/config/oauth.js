import { google } from "googleapis";

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const refresh_token =
  process.env.REFRESH_TOKEN ||
  "1//04dRPmcvQ1SFOCgYIARAAGAQSNwF-L9Ir_MdswDeKc01eruLMyVWNsKa7ykNMolajdenWq8zPsk8DjEos3kObNFreDSNYCTPtEvI";

////////////////////////////////
//                            //
//Google OAuth Setup for Email//
//                            //
////////////////////////////////

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);

oAuth2Client.setCredentials({ refresh_token });

export { oAuth2Client };
