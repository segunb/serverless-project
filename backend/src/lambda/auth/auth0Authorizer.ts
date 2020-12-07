import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda'
import 'source-map-support/register'

import { verify, decode } from 'jsonwebtoken'
import { createLogger } from '../../utils/logger'
import Axios from 'axios'
import { Jwt } from '../../auth/Jwt'
import { JwtPayload } from '../../auth/JwtPayload'

const logger = createLogger('auth')

// to verify JWT token signature.
// To get this URL you need to go to an Auth0 page -> Show Advanced Settings -> Endpoints -> JSON Web Key Set
const jwksUrl = process.env.CERTIFICATE_DOWNLOAD_URL

export const handler = async (event: CustomAuthorizerEvent): Promise<CustomAuthorizerResult> => {

  logger.info('Authorizing a user', event.authorizationToken)

  try {
    const jwtToken = await verifyToken(event.authorizationToken)
    logger.info('User was authorized', jwtToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader: string): Promise<JwtPayload> {
  const token = getToken(authHeader)
  const jwt: Jwt = decode(token, { complete: true }) as Jwt

  // You should implement it similarly to how it was implemented for the exercise for the lesson 5
  // You can read more about how to do this here: https://auth0.com/blog/navigating-rs256-and-jwks/
  const jwksResponse = await Axios.get(jwksUrl)
  const jwksKeys = jwksResponse.data.keys
  const matchingKey = jwksKeys.filter(x => x.kid == jwt.header.kid)

  logger.info("Axios GET response:", jwksKeys)
  logger.info("matchingKey:", matchingKey)

  const verifiedUserToken = verify(
      token,                            // Token from an HTTP header to validate
      getCertificate(matchingKey[0].x5c[0]),        // A certificate copied from Auth0 website
      { algorithms: ['RS256'] }  // We need to specify that we use the RS256 algorithm
  ) as JwtPayload

  logger.info("Verification response: ", verifiedUserToken)

  return verifiedUserToken
}

function getCertificate(p_JWTSExtract) {
  return "\n-----BEGIN CERTIFICATE-----\n" + p_JWTSExtract + "\n-----END CERTIFICATE-----\n"
}

function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header')

  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header')

  const split = authHeader.split(' ')
  return split[1]
}
