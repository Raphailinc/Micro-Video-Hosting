import dotenv from 'dotenv';
dotenv.config();

export async function load({ params }) {
  const { id } = params;
  return {
    props: {
      id,
      BASE_URL: process.env.BASE_URL || ''
    }
  };
}
