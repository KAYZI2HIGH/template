import React from 'react'

const Logo = ({className}: {className?: string}) => {
  return (
    <h1 className={`text-4xl mx-auto w-fit font-bold font-mooner-regular-outline tracking-wider! ${className}`}>
      ARBITRA
    </h1>
  );
}

export default Logo