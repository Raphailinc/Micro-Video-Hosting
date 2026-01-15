import dotenv from 'dotenv';
dotenv.config();

export async function load({ params }) {
  const { tag } = params;
  return {
    props: {
      tag,
      BASE_URL: process.env.BASE_URL || ''
    }
  };
}
